# Team 2 — Community Safety Command Centre

Residents report safety incidents; Amazon Bedrock triages them (severity,
summary, category) so response teams act on what matters first. Full brief:
[Challenge Brief — Community Safety Command Centre.pdf](Challenge%20Brief%20—%20Community%20Safety%20Command%20Centre.pdf).

Hackathon: Monday 27 October 2026, code freeze 15:00. All code must be
written during the hackathon, and we may only use team 2's AWS resources.

## Architecture

```
React frontend → API Gateway → Lambda (Python 3.12) → Bedrock (anthropic.claude-haiku-5-5)
                                     ↓
                     DynamoDB (incidents) · S3 (photos)
```

## AWS resources (af-south-1)

| Resource | Name |
|---|---|
| API Gateway (REST, stage `prod`) | `umbono-hackathon-team2` — routes `POST /reports`, `GET /reports` |
| Lambda — submit | `team2-submit-report` (TODO #1 Bedrock triage, TODO #2 storage) |
| Lambda — list | `team2-get-reports` (TODO #3 query) |
| DynamoDB table | `team2-incidents` — key `incidentId` (HASH) + `timestamp` (RANGE), on-demand |
| S3 bucket | `umbono-hackathon-team2-photos` — CORS allows browser `GET`/`PUT`/`POST` |

Get the API base URL with:

```
aws apigateway get-rest-apis --profile umbono_hackathon \
  --query "items[?name=='umbono-hackathon-team2'].id" --output text
# → https://<id>.execute-api.af-south-1.amazonaws.com/prod
```

Our IAM user (`hackathon-team2`) can deploy Lambda code and settings, read the
table and list the bucket, but **cannot** change the table (e.g. create
indexes), read bucket settings or see IAM roles. Ask the organisers for those.

## Incident fields

| Field | Notes |
|---|---|
| `incidentId`, `timestamp` | Table key; `timestamp` is an ISO-8601 string |
| `createdAt` | ISO-8601 string |
| `reporterName` | `Anonymous` when `isAnonymous` is set |
| `incidentType` | `suspicious_activity`, `theft`, `vandalism`, `traffic`, `fire`, `medical`, `noise`, `infrastructure`, `other` |
| `location` | Free text, e.g. "Corner of Rivonia Rd and 5th Street" |
| `description` | Free text |
| `severity` | From Bedrock: `critical`, `high`, `medium`, `low` |
| `aiSummary`, `aiCategory` | From Bedrock |
| `status` | `new` → `acknowledged` → `dispatched` → `resolved` |
| `latitude`, `longitude`, `photoUrl`, `isAnonymous`, `reportedSeverity` | Added on branch `todo_2` (not merged yet). Coordinates are stored as strings |

## `GET /reports`

| Parameter | Values | Default |
|---|---|---|
| `status` | one of the statuses above | — |
| `type` | one of the incident types above | — |
| `location` | text, case-insensitive substring of `location` | — |
| `q` | text, case-insensitive search of description, location, AI summary, type, AI category | — |
| `sort` | `timestamp`, `severity` (critical first) | `timestamp` |
| `order` | `desc`, `asc` | `desc` |
| `limit` | 1–100 | 50 |
| `nextToken` | value from the previous response | — |

Response: `{"incidents": [...], "count": n, "nextToken": "..."}`. `nextToken`
is present while more results remain; a final page can be empty. Invalid
parameters return `400` with an `error` message listing allowed values.

Things to know:

- **Status index.** `?status=` queries the GSI `status-timestamp-index`
  (partition `status`, sort `timestamp`). It doesn't exist yet — we can't
  create it — so the lambda falls back to a scan and retries the index every
  5 minutes. Sorting by time is only exact across pages once the index exists.
- **Severity sort** applies within each page, not across all incidents.
- **Photos.** Incidents whose `photoUrl` points into the team 2 bucket also get
  `photoViewUrl`, a signed link valid for 1 hour. Use it in `<img>` tags; the
  plain `photoUrl` may not be publicly readable. (Branch `feature/photo-uploads`.)

## Photo uploads

The bucket is private, so the browser uploads with a short-lived signed link
and displays photos through signed links. Three steps:

1. **Get an upload link:** `GET /reports?photoUpload=image/jpeg` (or
   `image/png`, `image/webp`) returns
   `{"photoUpload": {"url", "fields"}, "photoUrl", "maxBytes", "expiresIn"}`.
   The link is valid for 5 minutes.
2. **Upload straight to S3:** `POST` a `FormData` to `photoUpload.url` with
   every entry of `photoUpload.fields` first and the file last, as `file`.
   S3 returns `204`, and rejects other file types (`403`) or files over 5 MB
   (`400`).
3. **Submit the report** with `"photoUrl": <photoUrl from step 1>` — the
   `todo_2` version of `submit-report` validates and stores it.

```js
const res = await fetch(`${API}/reports?photoUpload=${encodeURIComponent(file.type)}`);
const { photoUpload, photoUrl } = await res.json();
const form = new FormData();
Object.entries(photoUpload.fields).forEach(([k, v]) => form.append(k, v));
form.append('file', file);
const upload = await fetch(photoUpload.url, { method: 'POST', body: form });
if (!upload.ok) throw new Error('Photo upload failed');
await fetch(`${API}/reports`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...report, photoUrl }) });
```

The upload link comes from `GET /reports` so no new AWS resources are needed;
it would sit better on its own endpoint if the organisers can add one. Photos uploaded for reports
that are never submitted stay in the bucket.

## Tests

Standard library only — no boto3, pip or AWS access needed:

```
python3 -m unittest discover -s tests -v
```

`tests/fake_aws.py` is an in-memory fake of the DynamoDB and S3 behaviour the
lambdas use, reusable for other lambdas' tests.

## Deploying a lambda

```
python3 -c "import zipfile;z=zipfile.ZipFile('/tmp/fn.zip','w');z.write('lambdas/get_reports/lambda_function.py','lambda_function.py');z.close()"
aws lambda update-function-code --function-name team2-get-reports \
  --profile umbono_hackathon --zip-file fileb:///tmp/fn.zip
```

Deploys aren't tied to branches — check what's live before overwriting a
teammate's work (`aws lambda get-function` returns a download link).

## Branches

Name feature branches `feature/<kebab-case-name>`, e.g.
`feature/todo-item-1-bedrock`, `feature/photo-uploads`. Lambda code currently
lives in three places across branches (`lambdas/get_reports/`,
`backend/submit-report/`, `team2-submit-report/`) — worth agreeing on one
layout before merging.
