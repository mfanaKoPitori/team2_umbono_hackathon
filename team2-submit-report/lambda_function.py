import json
import uuid
import os
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
bedrock = boto3.client('bedrock-runtime')

TABLE_NAME = os.environ['TABLE_NAME']
BEDROCK_MODEL_ID = os.environ.get('BEDROCK_MODEL_ID', 'anthropic.claude-haiku-5-5')

def lambda_handler(event, context):
    try:
        body = json.loads(event.get('body', '{}'))
        incident_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat() + 'Z'

        # ============================================================
        # TEAM TODO #1: AI TRIAGE WITH AMAZON BEDROCK
        # ============================================================
        # Uncomment and complete the Bedrock call below.
        # The AI should:
        #   1. Assess severity (critical / high / medium / low)
        #   2. Generate a one-line summary
        #   3. Suggest a refined category
        # ============================================================

        ai_severity = "medium"
        ai_summary = "Pending AI triage"
        ai_category = body.get('incidentType', 'other')

        # --- Uncomment below to call Bedrock ---
        # prompt = f"""You are a community safety AI triage system.
        # Analyse this incident report and respond in JSON format:
        # {{"severity": "critical|high|medium|low", "summary": "one-line summary", "category": "category"}}
        #
        # Incident Report:
        # Type: {body.get('incidentType', 'unknown')}
        # Location: {body.get('location', 'unknown')}
        # Description: {body.get('description', 'No description')}
        # """
        #
        # response = bedrock.invoke_model(
        #     modelId=BEDROCK_MODEL_ID,
        #     body=json.dumps({"anthropic_version": "bedrock-2023-05-31", "max_tokens": 300,
        #                      "messages": [{"role": "user", "content": prompt}]})
        # )
        # ai_response = json.loads(response['body'].read())
        # ai_result = json.loads(ai_response['content'][0]['text'])
        # ai_severity = ai_result['severity']
        # ai_summary = ai_result['summary']
        # ai_category = ai_result['category']
        # ============================================================

        # ============================================================
        # TEAM TODO #2: SAVE TO DYNAMODB
        # ============================================================
        # The code below works! But you might want to:
        #   - Add validation (is description too short? is type valid?)
        #   - Add location coordinates (latitude/longitude)
        #   - Add a photoUrl field if your frontend supports uploads
        # ============================================================

        table = dynamodb.Table(TABLE_NAME)
        item = {
            'incidentId': incident_id, 'timestamp': timestamp,
            'reporterName': body.get('reporterName', 'Anonymous'),
            'incidentType': body.get('incidentType', 'other'),
            'location': body.get('location', 'Unknown'),
            'description': body.get('description', ''),
            'severity': ai_severity, 'aiSummary': ai_summary,
            'aiCategory': ai_category, 'status': 'new', 'createdAt': timestamp
        }
        table.put_item(Item=item)

        return {'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'message': 'Incident reported successfully',
                                    'incidentId': incident_id, 'severity': ai_severity, 'aiSummary': ai_summary})}
    except Exception as e:
        print(f"Error: {str(e)}")
        return {'statusCode': 500,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': str(e)})}

