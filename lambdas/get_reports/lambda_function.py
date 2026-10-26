import base64
import json
import os
import time
import uuid
from decimal import Decimal
from urllib.parse import unquote, urlparse

import boto3
from boto3.dynamodb.conditions import Attr, Key
from botocore.config import Config
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb')
TABLE_NAME = os.environ['TABLE_NAME']
# Photos bucket; when unset, incidents are returned without photoViewUrl
BUCKET_NAME = os.environ.get('BUCKET_NAME')
REGION = os.environ.get('AWS_REGION', 'af-south-1')
# af-south-1 is an opt-in region, so presigned URLs must use its regional endpoint
s3 = boto3.client('s3', region_name=REGION, endpoint_url=f'https://s3.{REGION}.amazonaws.com',
                  config=Config(signature_version='s3v4', s3={'addressing_style': 'virtual'}))
PHOTO_URL_EXPIRY_SECONDS = 3600
PHOTO_UPLOAD_EXPIRY_SECONDS = 300
MAX_PHOTO_BYTES = 5 * 1024 * 1024
PHOTO_TYPES = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp'}
# GSI with partition key `status` and sort key `timestamp`
STATUS_INDEX_NAME = os.environ.get('STATUS_INDEX_NAME', 'status-timestamp-index')

DEFAULT_LIMIT = 50
MAX_LIMIT = 100
# Upper bound on DynamoDB round trips per request when text filters drop most items
MAX_PAGES = 10
# Items DynamoDB evaluates per call when filters may drop some. Larger batches
# mean fewer round trips; surplus matches are cut and resumed via nextToken.
FILTERED_READ_SIZE = 100
# After the index is found missing, skip it for this long before trying again,
# so warm containers pick up the index soon after it's created
INDEX_RETRY_SECONDS = 300

# Per-container: monotonic time until which the index is assumed missing
_index_missing_until = 0.0

VALID_STATUSES = {'new', 'acknowledged', 'dispatched', 'resolved'}
VALID_TYPES = {'suspicious_activity', 'theft', 'vandalism', 'traffic', 'fire',
               'medical', 'noise', 'infrastructure', 'other'}
# Lower rank = more urgent; incidents without a severity sort last
SEVERITY_RANK = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
SEARCH_FIELDS = ('description', 'location', 'aiSummary', 'incidentType', 'aiCategory')

HEADERS = {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}


class BadRequest(Exception):
    pass


def _response(status_code, body):
    return {'statusCode': status_code, 'headers': HEADERS, 'body': json.dumps(body, default=str)}


def _parse_limit(raw):
    if raw is None:
        return DEFAULT_LIMIT
    try:
        limit = int(raw)
    except ValueError:
        raise BadRequest('limit must be an integer')
    if limit < 1:
        raise BadRequest('limit must be at least 1')
    return min(limit, MAX_LIMIT)


def _parse_choice(params, name, choices, default=None):
    value = params.get(name, default)
    if value is not None and value not in choices:
        raise BadRequest(f"{name} must be one of: {', '.join(sorted(choices))}")
    return value


def _decimal_to_json(d):
    if isinstance(d, Decimal):
        return int(d) if d == d.to_integral_value() else float(d)
    raise TypeError(f'{type(d).__name__} is not JSON serialisable')


def _encode_token(last_key):
    # DynamoDB keys can hold Decimals; they're restored as Decimals on decode
    raw = json.dumps(last_key, default=_decimal_to_json)
    return base64.urlsafe_b64encode(raw.encode()).decode()


def _decode_token(token):
    try:
        raw = base64.urlsafe_b64decode(token.encode()).decode()
        last_key = json.loads(raw, parse_float=Decimal, parse_int=Decimal)
    except (ValueError, UnicodeDecodeError):
        raise BadRequest('invalid nextToken')
    if not isinstance(last_key, dict):
        raise BadRequest('invalid nextToken')
    return last_key


def _is_missing_index(error):
    err = error.response.get('Error', {})
    return err.get('Code') == 'ValidationException' and 'index' in err.get('Message', '').lower()


def _photo_key(photo_url):
    """Return the object key if photo_url points into our bucket, else None.

    Accepts virtual-hosted (bucket.s3[.region].amazonaws.com/key) and
    path-style (s3[.region].amazonaws.com/bucket/key) URLs.
    """
    if not isinstance(photo_url, str):
        return None
    try:
        parsed = urlparse(photo_url)
    except ValueError:
        return None
    if parsed.scheme != 'https':
        return None
    host, path = parsed.netloc.lower(), unquote(parsed.path).lstrip('/')
    s3_hosts = ('s3.amazonaws.com', f's3.{REGION}.amazonaws.com')
    if host in tuple(f'{BUCKET_NAME}.{h}' for h in s3_hosts):
        key = path
    elif host in s3_hosts and path.startswith(f'{BUCKET_NAME}/'):
        key = path[len(BUCKET_NAME) + 1:]
    else:
        return None
    return key or None


def _add_photo_view_url(item):
    # A signed link works whether or not the bucket is public. Photos hosted
    # anywhere else are not linked, to avoid showing untrusted URLs.
    key = _photo_key(item.get('photoUrl')) if BUCKET_NAME else None
    if key:
        item['photoViewUrl'] = s3.generate_presigned_url(
            'get_object', Params={'Bucket': BUCKET_NAME, 'Key': key},
            ExpiresIn=PHOTO_URL_EXPIRY_SECONDS)


def _photo_upload(content_type):
    """Presigned S3 POST for uploading one photo before submitting a report.

    The browser posts the file to `photoUpload.url` with `photoUpload.fields`,
    then sends `photoUrl` with POST /reports. S3 enforces the type and size.
    """
    if not BUCKET_NAME:
        raise RuntimeError('BUCKET_NAME is not configured')
    if content_type not in PHOTO_TYPES:
        raise BadRequest(f"photoUpload must be one of: {', '.join(sorted(PHOTO_TYPES))}")
    key = f'photos/{uuid.uuid4()}.{PHOTO_TYPES[content_type]}'
    upload = s3.generate_presigned_post(
        BUCKET_NAME, key,
        Fields={'Content-Type': content_type},
        Conditions=[{'Content-Type': content_type},
                    ['content-length-range', 1, MAX_PHOTO_BYTES]],
        ExpiresIn=PHOTO_UPLOAD_EXPIRY_SECONDS)
    return {
        'photoUpload': upload,
        'photoUrl': f'https://{BUCKET_NAME}.s3.{REGION}.amazonaws.com/{key}',
        'maxBytes': MAX_PHOTO_BYTES,
        'expiresIn': PHOTO_UPLOAD_EXPIRY_SECONDS,
    }


def _matches_text(item, location, search):
    # Case-insensitive substring matching; DynamoDB's contains() is case-sensitive
    if location and location not in str(item.get('location', '')).lower():
        return False
    if search and not any(search in str(item.get(f, '')).lower() for f in SEARCH_FIELDS):
        return False
    return True


def _collect(fetch, kwargs, limit, location, search, key_attrs):
    """Fetch pages until `limit` items match the text filters or the data runs out.

    Returns the matched items and the key to resume from (None when exhausted).
    """
    items = []
    last_key = kwargs.get('ExclusiveStartKey')
    for _ in range(MAX_PAGES):
        if last_key:
            kwargs['ExclusiveStartKey'] = last_key
        response = fetch(**kwargs)
        page = [i for i in response.get('Items', []) if _matches_text(i, location, search)]
        last_key = response.get('LastEvaluatedKey')
        if len(items) + len(page) > limit:
            # Stop part-way through this page and resume after the last item returned
            items.extend(page[:limit - len(items)])
            return items, {k: items[-1][k] for k in key_attrs}
        items.extend(page)
        if len(items) == limit or not last_key:
            break
    return items, last_key


def lambda_handler(event, context):
    global _index_missing_until
    try:
        table = dynamodb.Table(TABLE_NAME)
        params = event.get('queryStringParameters') or {}
        if 'photoUpload' in params:
            # Lives here because there is no separate upload route yet
            return _response(200, _photo_upload(params['photoUpload']))
        status_filter = _parse_choice(params, 'status', VALID_STATUSES)
        type_filter = _parse_choice(params, 'type', VALID_TYPES)
        sort = _parse_choice(params, 'sort', {'timestamp', 'severity'}, 'timestamp')
        order = _parse_choice(params, 'order', {'asc', 'desc'}, 'desc')
        limit = _parse_limit(params.get('limit'))
        location = (params.get('location') or '').strip().lower()
        search = (params.get('q') or '').strip().lower()

        def read_size(filtered):
            # Unfiltered reads return every item evaluated, so read exactly one page
            return max(limit, FILTERED_READ_SIZE) if filtered else limit

        base_kwargs = {}
        if params.get('nextToken'):
            base_kwargs['ExclusiveStartKey'] = _decode_token(params['nextToken'])

        items = last_key = None
        if status_filter and time.monotonic() >= _index_missing_until:
            # Query the GSI: reads only matching items, already sorted by timestamp
            kwargs = dict(base_kwargs,
                          Limit=read_size(bool(type_filter or location or search)),
                          IndexName=STATUS_INDEX_NAME,
                          KeyConditionExpression=Key('status').eq(status_filter),
                          ScanIndexForward=order == 'asc')
            if type_filter:
                kwargs['FilterExpression'] = Attr('incidentType').eq(type_filter)
            try:
                items, last_key = _collect(table.query, kwargs, limit, location, search,
                                           ('incidentId', 'timestamp', 'status'))
            except ClientError as e:
                if not _is_missing_index(e):
                    raise
                _index_missing_until = time.monotonic() + INDEX_RETRY_SECONDS
                print(f"Index {STATUS_INDEX_NAME} unavailable, using scan for "
                      f"{INDEX_RETRY_SECONDS}s: {e}")

        if items is None:
            # No index to query on, so fall back to a paginated scan.
            # Sorting only applies within the returned page.
            kwargs = dict(base_kwargs,
                          Limit=read_size(bool(status_filter or type_filter or location or search)))
            filters = []
            if status_filter:
                filters.append(Attr('status').eq(status_filter))
            if type_filter:
                filters.append(Attr('incidentType').eq(type_filter))
            if filters:
                combined = filters[0]
                for f in filters[1:]:
                    combined = combined & f
                kwargs['FilterExpression'] = combined
            items, last_key = _collect(table.scan, kwargs, limit, location, search,
                                       ('incidentId', 'timestamp'))

        newest_first = order == 'desc'
        items.sort(key=lambda x: x.get('timestamp', ''), reverse=newest_first)
        if sort == 'severity':
            # Stable sort keeps newest-first within each severity
            items.sort(key=lambda x: SEVERITY_RANK.get(x.get('severity'), len(SEVERITY_RANK)),
                       reverse=order == 'asc')
        for item in items:
            _add_photo_view_url(item)

        body = {'incidents': items, 'count': len(items)}
        if last_key:
            body['nextToken'] = _encode_token(last_key)
        return _response(200, body)
    except BadRequest as e:
        return _response(400, {'error': str(e)})
    except Exception as e:
        print(f"Error: {str(e)}")
        return _response(500, {'error': str(e)})
