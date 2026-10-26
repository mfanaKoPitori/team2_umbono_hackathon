import base64
import json
import os
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Attr, Key
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb')
TABLE_NAME = os.environ['TABLE_NAME']
# GSI with partition key `status` and sort key `timestamp`
STATUS_INDEX_NAME = os.environ.get('STATUS_INDEX_NAME', 'status-timestamp-index')

DEFAULT_LIMIT = 50
MAX_LIMIT = 100
# Upper bound on DynamoDB round trips per request when text filters drop most items
MAX_PAGES = 10

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
    try:
        table = dynamodb.Table(TABLE_NAME)
        params = event.get('queryStringParameters') or {}
        status_filter = _parse_choice(params, 'status', VALID_STATUSES)
        type_filter = _parse_choice(params, 'type', VALID_TYPES)
        sort = _parse_choice(params, 'sort', {'timestamp', 'severity'}, 'timestamp')
        order = _parse_choice(params, 'order', {'asc', 'desc'}, 'desc')
        limit = _parse_limit(params.get('limit'))
        location = (params.get('location') or '').strip().lower()
        search = (params.get('q') or '').strip().lower()

        base_kwargs = {'Limit': limit}
        if params.get('nextToken'):
            base_kwargs['ExclusiveStartKey'] = _decode_token(params['nextToken'])

        items = last_key = None
        if status_filter:
            # Query the GSI: reads only matching items, already sorted by timestamp
            kwargs = dict(base_kwargs,
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
                print(f"Index {STATUS_INDEX_NAME} unavailable, falling back to scan: {e}")

        if items is None:
            # No index to query on, so fall back to a paginated scan.
            # Sorting only applies within the returned page.
            kwargs = dict(base_kwargs)
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

        body = {'incidents': items, 'count': len(items)}
        if last_key:
            body['nextToken'] = _encode_token(last_key)
        return _response(200, body)
    except BadRequest as e:
        return _response(400, {'error': str(e)})
    except Exception as e:
        print(f"Error: {str(e)}")
        return _response(500, {'error': str(e)})
