import json
import uuid
import os
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
bedrock = boto3.client('bedrock-runtime')

TABLE_NAME = os.environ['TABLE_NAME']
BEDROCK_MODEL_ID = os.environ.get('BEDROCK_MODEL_ID', 'anthropic.claude-haiku-5-5')

VALID_TYPES = {'suspicious_activity', 'theft', 'vandalism', 'traffic', 'fire', 'medical', 'noise', 'infrastructure', 'other'}
VALID_SEVERITIES = {'critical', 'high', 'medium', 'low'}
PHOTO_URL_PREFIX = 'https://umbono-hackathon-team2-photos.s3'
HEADERS = {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}


def respond(status, payload):
    return {'statusCode': status, 'headers': HEADERS, 'body': json.dumps(payload)}


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


def lambda_handler(event, context):
    try:
        try:
            body = json.loads(event.get('body') or '{}')
        except json.JSONDecodeError:
            return respond(400, {'error': 'Request body must be valid JSON'})
        if not isinstance(body, dict):
            return respond(400, {'error': 'Request body must be a JSON object'})

        data, errors = validate(body)
        if errors:
            return respond(400, {'error': 'Validation failed', 'details': errors})

        incident_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat() + 'Z'

        # TEAM TODO #1: AI TRIAGE WITH AMAZON BEDROCK (left for the teammate doing TODO 1)
        ai_severity = data['reportedSeverity'] or "medium"
        ai_summary = "Pending AI triage"
        ai_category = data['incidentType']

        # TODO #2 DONE: validated and enriched DynamoDB save
        location_text = data['location']
        if not location_text and data['latitude'] is not None:
            location_text = f"GPS {data['latitude']:.6f}, {data['longitude']:.6f}"

        item = {
            'incidentId': incident_id, 'timestamp': timestamp, 'createdAt': timestamp,
            'updatedAt': timestamp, 'reporterName': data['reporterName'],
            'isAnonymous': data['isAnonymous'], 'incidentType': data['incidentType'],
            'location': location_text, 'description': data['description'],
            'reportedSeverity': data['reportedSeverity'] or 'not_given',
            'severity': ai_severity, 'aiSummary': ai_summary, 'aiCategory': ai_category,
            'status': 'new', 'source': data['source'],
        }
        # Stored as text so the GET Lambda can return them without changes
        if data['latitude'] is not None:
            item['latitude'] = f"{data['latitude']:.6f}"
            item['longitude'] = f"{data['longitude']:.6f}"
        if data['photoUrl']:
            item['photoUrl'] = data['photoUrl']

        dynamodb.Table(TABLE_NAME).put_item(Item=item)

        return respond(200, {'message': 'Incident reported successfully', 'incidentId': incident_id,
                             'severity': ai_severity, 'aiSummary': ai_summary})
    except Exception as e:
        print(f"Error: {str(e)}")
        return respond(500, {'error': str(e)})
