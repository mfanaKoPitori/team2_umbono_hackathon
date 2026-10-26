import json
import uuid
import os
import boto3
from datetime import datetime
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb')
bedrock = boto3.client('bedrock-runtime')

TABLE_NAME = os.environ['TABLE_NAME']
BEDROCK_MODEL_ID = os.environ.get('BEDROCK_MODEL_ID', 'anthropic.claude-haiku-5-5')

VALID_SEVERITIES = {'critical', 'high', 'medium', 'low'}
VALID_CATEGORIES = {'suspicious_activity', 'theft', 'vandalism', 'traffic', 'fire',
                    'medical', 'noise', 'infrastructure', 'other'}
VALID_TYPES = VALID_CATEGORIES
STATUS_FLOW = ['new', 'acknowledged', 'dispatched', 'resolved']
STATUS_TIME_FIELD = {'acknowledged': 'acknowledgedAt', 'dispatched': 'dispatchedAt', 'resolved': 'resolvedAt'}
PHOTO_URL_PREFIX = 'https://umbono-hackathon-team2-photos.s3'
HEADERS = {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}


# ================= TODO #1: AI TRIAGE WITH BEDROCK (teammate's code, unchanged) =================
def triage_incident(body):
    prompt = f"""You are a community safety AI triage system.
Analyse this incident report and respond with only JSON, no other text:
{{"severity": "critical|high|medium|low", "summary": "one-line summary", "category": "category"}}

category must be one of: {', '.join(sorted(VALID_CATEGORIES))}

Incident Report:
Type: {body.get('incidentType', 'unknown')}
Location: {body.get('location', 'unknown')}
Description: {body.get('description', 'No description')}
"""

    response = bedrock.invoke_model(
        modelId=BEDROCK_MODEL_ID,
        body=json.dumps({"anthropic_version": "bedrock-2023-05-31", "max_tokens": 300,
                         "messages": [{"role": "user", "content": prompt}]})
    )
    ai_response = json.loads(response['body'].read())
    text = ai_response['content'][0]['text']
    # Model may wrap the JSON in prose or code fences; take the outermost object
    ai_result = json.loads(text[text.find('{'):text.rfind('}') + 1])

    severity = str(ai_result.get('severity', '')).lower()
    category = str(ai_result.get('category', '')).lower()
    return (severity if severity in VALID_SEVERITIES else 'medium',
            str(ai_result.get('summary', '')).strip() or 'Pending AI triage',
            category if category in VALID_CATEGORIES else body.get('incidentType', 'other'))


# ================= TODO #2: VALIDATION AND RICHER DATA =================
def respond(status, payload):
    return {'statusCode': status, 'headers': HEADERS, 'body': json.dumps(payload)}


def now_iso():
    return datetime.utcnow().isoformat() + 'Z'


def clean_text(value, max_len):
    if value is None:
        return ''
    return str(value).strip()[:max_len]


def to_coordinate(value, low, high):
    if value is None or value == '':
        return None
    number = float(value)
    if not (low <= number <= high):
        raise ValueError('out of range')
    return number


def validate(body):
    errors = []
    description = clean_text(body.get('description'), 2000)
    location = clean_text(body.get('location'), 300)
    incident_type = clean_text(body.get('incidentType'), 50).lower() or 'other'
    reported_severity = clean_text(body.get('severity'), 20).lower()
    photo_url = clean_text(body.get('photoUrl'), 1000)
    is_anonymous = body.get('isAnonymous') in (True, 'true', 'True', 1, '1')
    reporter_name = 'Anonymous' if is_anonymous else (clean_text(body.get('reporterName'), 100) or 'Anonymous')

    latitude = longitude = None
    try:
        latitude = to_coordinate(body.get('latitude'), -90, 90)
        longitude = to_coordinate(body.get('longitude'), -180, 180)
    except (ValueError, TypeError):
        errors.append('latitude and longitude must be valid numbers')
    if (latitude is None) != (longitude is None) and not errors:
        errors.append('send both latitude and longitude, or neither')

    if len(description) < 10:
        errors.append('description must be at least 10 characters')
    if not location and latitude is None:
        errors.append('a location or GPS coordinates are required')
    if incident_type not in VALID_TYPES:
        errors.append('incidentType must be one of: ' + ', '.join(sorted(VALID_TYPES)))
    if reported_severity and reported_severity not in VALID_SEVERITIES:
        errors.append('severity must be critical, high, medium or low')
    if photo_url and not photo_url.startswith(PHOTO_URL_PREFIX):
        errors.append('photoUrl must point to the team2 photos bucket')

    data = {
        'description': description, 'location': location, 'incidentType': incident_type,
        'reportedSeverity': reported_severity, 'photoUrl': photo_url, 'isAnonymous': is_anonymous,
        'reporterName': reporter_name, 'latitude': latitude, 'longitude': longitude,
        'source': clean_text(body.get('source'), 20) or 'web',
    }
    return data, errors


# ================= EXTRA: STATUS WORKFLOW (new -> acknowledged -> dispatched -> resolved) =================
def update_status(body):
    incident_id = clean_text(body.get('incidentId'), 100)
    timestamp = clean_text(body.get('timestamp'), 50)
    new_status = clean_text(body.get('status'), 20).lower()
    if not incident_id or not timestamp:
        return respond(400, {'error': 'Validation failed', 'details': ['incidentId and timestamp are required']})
    if new_status not in STATUS_FLOW[1:]:
        return respond(400, {'error': 'Validation failed', 'details': ['status must be acknowledged, dispatched or resolved']})

    expected_previous = STATUS_FLOW[STATUS_FLOW.index(new_status) - 1]
    changed_at = now_iso()
    try:
        dynamodb.Table(TABLE_NAME).update_item(
            Key={'incidentId': incident_id, 'timestamp': timestamp},
            UpdateExpression='SET #status = :new, #changed = :now, updatedAt = :now, '
                             'statusHistory = list_append(if_not_exists(statusHistory, :empty), :entry)',
            ConditionExpression='attribute_exists(incidentId) AND #status = :expected',
            ExpressionAttributeNames={'#status': 'status', '#changed': STATUS_TIME_FIELD[new_status]},
            ExpressionAttributeValues={':new': new_status, ':expected': expected_previous, ':now': changed_at,
                                       ':empty': [], ':entry': [{'status': new_status, 'at': changed_at}]},
        )
    except ClientError as e:
        if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
            return respond(409, {'error': f'Incident not found, or it is not {expected_previous} yet'})
        raise
    return respond(200, {'message': 'Status updated', 'incidentId': incident_id,
                         'status': new_status, 'updatedAt': changed_at})


def lambda_handler(event, context):
    try:
        try:
            body = json.loads(event.get('body') or '{}')
        except json.JSONDecodeError:
            return respond(400, {'error': 'Request body must be valid JSON'})
        if not isinstance(body, dict):
            return respond(400, {'error': 'Request body must be a JSON object'})

        if body.get('action') == 'update_status':
            return update_status(body)

        data, errors = validate(body)
        if errors:
            return respond(400, {'error': 'Validation failed', 'details': errors})

        incident_id = str(uuid.uuid4())
        timestamp = now_iso()

        location_text = data['location']
        if not location_text and data['latitude'] is not None:
            location_text = f"GPS {data['latitude']:.6f}, {data['longitude']:.6f}"

        # TODO #1: AI triage. If Bedrock fails, the report is still saved using the reporter's own choices.
        ai_severity = data['reportedSeverity'] or 'medium'
        ai_summary = 'Pending AI triage'
        ai_category = data['incidentType']
        try:
            ai_severity, ai_summary, ai_category = triage_incident({
                'incidentType': data['incidentType'],
                'location': location_text,
                'description': data['description'],
            })
        except Exception as e:
            print(f"Bedrock triage failed: {str(e)}")

        # TODO #2: validated and enriched DynamoDB save
        item = {
            'incidentId': incident_id, 'timestamp': timestamp, 'createdAt': timestamp,
            'updatedAt': timestamp, 'reporterName': data['reporterName'],
            'isAnonymous': data['isAnonymous'], 'incidentType': data['incidentType'],
            'location': location_text, 'description': data['description'],
            'reportedSeverity': data['reportedSeverity'] or 'not_given',
            'severity': ai_severity, 'aiSummary': ai_summary, 'aiCategory': ai_category,
            'status': 'new', 'statusHistory': [{'status': 'new', 'at': timestamp}],
            'source': data['source'],
        }
        # Stored as text so the GET Lambda can return them without changes
        if data['latitude'] is not None:
            item['latitude'] = f"{data['latitude']:.6f}"
            item['longitude'] = f"{data['longitude']:.6f}"
        if data['photoUrl']:
            item['photoUrl'] = data['photoUrl']

        dynamodb.Table(TABLE_NAME).put_item(Item=item)

        return respond(200, {'message': 'Incident reported successfully', 'incidentId': incident_id,
                             'timestamp': timestamp, 'severity': ai_severity,
                             'aiSummary': ai_summary, 'aiCategory': ai_category})
    except Exception as e:
        print(f"Error: {str(e)}")
        return respond(500, {'error': str(e)})
