"""Unit tests for lambdas/get_reports.

Run from the repo root:  python3 -m unittest discover -s tests -v
"""
import base64
import importlib.util
import json
import os
import pathlib
import unittest
from decimal import Decimal

import fake_aws

fake_aws.install()
os.environ['TABLE_NAME'] = 'test-incidents'
os.environ['BUCKET_NAME'] = 'test-photos'
os.environ['AWS_REGION'] = 'af-south-1'

_SOURCE = pathlib.Path(__file__).resolve().parents[1] / 'lambdas' / 'get_reports' / 'lambda_function.py'
_spec = importlib.util.spec_from_file_location('get_reports_lambda', _SOURCE)
lf = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(lf)

TABLE = fake_aws.TABLE
S3 = fake_aws.S3
SEVERITIES = ['low', 'critical', 'medium', 'high', None]


def make_incidents(count=30):
    incidents = []
    for n in range(count):
        item = {
            'incidentId': f'id{n:03}',
            'timestamp': f'2026-10-27T{n // 60:02}:{n % 60:02}:00Z',
            'status': ['new', 'resolved'][n % 2],
            'incidentType': 'fire' if n % 3 == 0 else 'theft',
            'location': 'Corner of Rivonia Rd' if n % 4 == 0 else 'Main St',
            'description': f'Phone SNATCHED near shop {n}' if n % 7 == 0 else 'Loud noise',
        }
        if SEVERITIES[n % 5]:
            item['severity'] = SEVERITIES[n % 5]
        incidents.append(item)
    return incidents


def invoke(params):
    TABLE.calls.clear()
    response = lf.lambda_handler({'queryStringParameters': params}, None)
    return response['statusCode'], json.loads(response['body'])


def fetch_all_pages(params):
    """Follow nextToken until exhausted; returns incident ids in order."""
    ids, token = [], None
    for _ in range(100):
        status, body = invoke(dict(params, nextToken=token) if token else params)
        assert status == 200, body
        ids += [i['incidentId'] for i in body['incidents']]
        token = body.get('nextToken')
        if not token:
            return ids
    raise AssertionError('pagination did not terminate')


def expected_ids(predicate, newest_first=True):
    matching = sorted((i for i in TABLE.items if predicate(i)),
                      key=lambda i: i['timestamp'], reverse=newest_first)
    return [i['incidentId'] for i in matching]


class GetReportsTestCase(unittest.TestCase):
    def setUp(self):
        TABLE.items = make_incidents()
        TABLE.has_index = True
        TABLE.stale_items = None
        lf._index_missing_until = 0.0
        S3.presigned.clear()


class ResponseShapeTests(GetReportsTestCase):
    def test_no_params_returns_incidents_newest_first(self):
        status, body = invoke(None)
        self.assertEqual(status, 200)
        self.assertEqual(body['count'], 30)
        timestamps = [i['timestamp'] for i in body['incidents']]
        self.assertEqual(timestamps, sorted(timestamps, reverse=True))
        self.assertNotIn('nextToken', body)

    def test_cors_and_content_type_headers(self):
        response = lf.lambda_handler({'queryStringParameters': None}, None)
        self.assertEqual(response['headers']['Access-Control-Allow-Origin'], '*')
        self.assertEqual(response['headers']['Content-Type'], 'application/json')

    def test_unexpected_error_returns_500(self):
        original_scan = TABLE.scan
        TABLE.scan = lambda **kwargs: (_ for _ in ()).throw(RuntimeError('boom'))
        try:
            status, body = invoke(None)
        finally:
            TABLE.scan = original_scan
        self.assertEqual(status, 500)
        self.assertEqual(body['error'], 'boom')


class PrivacyTests(GetReportsTestCase):
    def setUp(self):
        super().setUp()
        for item in TABLE.items:
            item['reporterName'] = 'Jane Smith'

    def assertNoReporterName(self, incidents):
        self.assertGreater(len(incidents), 0)
        self.assertTrue(all('reporterName' not in i for i in incidents))

    def test_reporter_name_stripped_from_unfiltered_scan(self):
        _, body = invoke(None)
        self.assertNoReporterName(body['incidents'])

    def test_reporter_name_stripped_from_status_index_query(self):
        _, body = invoke({'status': 'new'})
        self.assertEqual(TABLE.calls[0][0], 'query')
        self.assertNoReporterName(body['incidents'])

    def test_reporter_name_stripped_from_filtered_fallback_scan(self):
        TABLE.has_index = False
        _, body = invoke({'status': 'new', 'type': 'fire'})
        self.assertEqual(TABLE.calls[-1][0], 'scan')
        self.assertNoReporterName(body['incidents'])

    def test_reporter_name_stripped_across_every_page(self):
        token, pages_seen = None, 0
        for _ in range(100):
            params = {'limit': '4', 'nextToken': token} if token else {'limit': '4'}
            status, body = invoke(params)
            self.assertEqual(status, 200)
            self.assertNoReporterName(body['incidents'])
            pages_seen += 1
            token = body.get('nextToken')
            if not token:
                break
        else:
            raise AssertionError('pagination did not terminate')
        self.assertGreater(pages_seen, 1)

    def test_reporter_name_stripped_alongside_photo_view_url(self):
        TABLE.items = [dict(make_incidents(1)[0], reporterName='Jane Smith',
                            photoUrl='https://test-photos.s3.af-south-1.amazonaws.com/photos/a.jpg')]
        _, body = invoke(None)
        incident = body['incidents'][0]
        self.assertNotIn('reporterName', incident)
        self.assertIn('photoViewUrl', incident)


class StatusIndexTests(GetReportsTestCase):
    def test_status_filter_queries_index(self):
        invoke({'status': 'new'})
        operation, kwargs = TABLE.calls[0]
        self.assertEqual(operation, 'query')
        self.assertEqual(kwargs['IndexName'], 'status-timestamp-index')
        self.assertFalse(kwargs['ScanIndexForward'])

    def test_status_filter_pages_through_all_matches(self):
        self.assertEqual(fetch_all_pages({'status': 'new', 'limit': '4'}),
                         expected_ids(lambda i: i['status'] == 'new'))

    def test_order_asc_returns_oldest_first(self):
        self.assertEqual(fetch_all_pages({'status': 'new', 'order': 'asc', 'limit': '3'}),
                         expected_ids(lambda i: i['status'] == 'new', newest_first=False))

    def test_status_and_type_filters_combine(self):
        self.assertEqual(fetch_all_pages({'status': 'new', 'type': 'fire', 'limit': '2'}),
                         expected_ids(lambda i: i['status'] == 'new' and i['incidentType'] == 'fire'))

    def test_other_client_errors_are_not_treated_as_missing_index(self):
        original_query = TABLE.query

        def throttled(**kwargs):
            raise fake_aws.ClientError(
                {'Error': {'Code': 'ProvisionedThroughputExceededException', 'Message': 'slow down'}},
                'Query')

        TABLE.query = throttled
        try:
            status, _ = invoke({'status': 'new'})
        finally:
            TABLE.query = original_query
        self.assertEqual(status, 500)


class MissingIndexFallbackTests(GetReportsTestCase):
    def setUp(self):
        super().setUp()
        TABLE.has_index = False

    def test_falls_back_to_filtered_scan(self):
        status, body = invoke({'status': 'new'})
        self.assertEqual(status, 200)
        self.assertEqual([op for op, _ in TABLE.calls], ['query', 'scan'])
        self.assertNotIn('IndexName', TABLE.calls[1][1])
        self.assertEqual([i['incidentId'] for i in body['incidents']],
                         expected_ids(lambda i: i['status'] == 'new'))

    def test_fallback_pages_through_all_matches(self):
        ids = fetch_all_pages({'status': 'new', 'type': 'theft', 'limit': '4'})
        self.assertCountEqual(ids, expected_ids(
            lambda i: i['status'] == 'new' and i['incidentType'] == 'theft'))

    def test_skips_index_during_retry_window(self):
        invoke({'status': 'new'})
        invoke({'status': 'new'})
        self.assertEqual([op for op, _ in TABLE.calls], ['scan'])

    def test_retries_index_after_window_expires(self):
        invoke({'status': 'new'})
        TABLE.has_index = True
        invoke({'status': 'new'})
        self.assertEqual([op for op, _ in TABLE.calls], ['scan'])
        lf._index_missing_until = 0.0
        invoke({'status': 'new'})
        self.assertEqual([op for op, _ in TABLE.calls], ['query'])


class ConsistentReadTests(GetReportsTestCase):
    """The dashboard reloads straight after a write, before replicas catch up."""

    def setUp(self):
        super().setUp()
        TABLE.stale_items = [dict(i) for i in TABLE.items]
        TABLE.items[0]['status'] = 'acknowledged'
        TABLE.items.append(dict(TABLE.items[1], incidentId='just-submitted',
                                timestamp='2026-10-27T23:59:00Z', status='new'))

    def test_list_returns_status_changed_just_before(self):
        _, body = invoke({})
        statuses = {i['incidentId']: i['status'] for i in body['incidents']}
        self.assertEqual(statuses['id000'], 'acknowledged')

    def test_list_returns_incident_submitted_just_before(self):
        _, body = invoke({})
        self.assertEqual(body['incidents'][0]['incidentId'], 'just-submitted')

    def test_every_page_reads_consistently(self):
        ids = fetch_all_pages({'limit': '7'})
        self.assertIn('just-submitted', ids)
        self.assertTrue(all(kwargs['ConsistentRead'] for _, kwargs in TABLE.calls))

    def test_fallback_scan_reads_consistently(self):
        TABLE.has_index = False
        _, body = invoke({'status': 'acknowledged'})
        self.assertIn('id000', [i['incidentId'] for i in body['incidents']])

    def test_index_query_does_not_ask_for_consistent_read(self):
        status, _ = invoke({'status': 'new'})
        self.assertEqual(status, 200)
        self.assertNotIn('ConsistentRead', TABLE.calls[0][1])


class TextFilterTests(GetReportsTestCase):
    def test_location_filter_is_case_insensitive(self):
        ids = fetch_all_pages({'location': 'RIVONIA', 'limit': '2'})
        self.assertCountEqual(ids, expected_ids(lambda i: 'Rivonia' in i['location']))
        self.assertEqual(len(ids), len(set(ids)))

    def test_search_matches_description(self):
        ids = fetch_all_pages({'q': 'snatched', 'status': 'resolved', 'limit': '1'})
        self.assertEqual(ids, expected_ids(
            lambda i: i['status'] == 'resolved' and 'SNATCHED' in i['description']))

    def test_search_covers_ai_fields(self):
        TABLE.items[5]['aiSummary'] = 'Armed robbery in progress'
        _, body = invoke({'q': 'robbery'})
        self.assertEqual([i['incidentId'] for i in body['incidents']], ['id005'])

    def test_filtered_page_is_filled_to_limit(self):
        _, body = invoke({'location': 'rivonia', 'limit': '3'})
        self.assertEqual(body['count'], 3)
        self.assertIn('nextToken', body)

    def test_blank_filters_are_ignored(self):
        _, body = invoke({'q': '   ', 'location': ''})
        self.assertEqual(body['count'], 30)


class ReadSizeTests(GetReportsTestCase):
    def test_unfiltered_reads_exactly_one_page(self):
        invoke({'limit': '5'})
        self.assertEqual(TABLE.calls[0][1]['Limit'], 5)

    def test_status_only_query_reads_exactly_one_page(self):
        invoke({'status': 'new', 'limit': '5'})
        self.assertEqual(TABLE.calls[0][1]['Limit'], 5)

    def test_filtered_requests_read_in_larger_batches(self):
        for params in ({'type': 'fire'}, {'q': 'x'}, {'location': 'x'},
                       {'status': 'new', 'type': 'fire'}):
            with self.subTest(params=params):
                invoke(dict(params, limit='5'))
                self.assertEqual(TABLE.calls[0][1]['Limit'], lf.FILTERED_READ_SIZE)

    def test_sparse_matches_in_large_table(self):
        TABLE.items = [dict(i, status='new', location='Rivonia' if n % 37 == 0 else 'Main')
                       for n, i in enumerate(make_incidents(250))]
        _, body = invoke({'location': 'rivonia', 'limit': '3'})
        self.assertEqual(body['count'], 3)
        self.assertLessEqual(len(TABLE.calls), 3)
        rivonia = lambda i: i['location'] == 'Rivonia'
        self.assertCountEqual(fetch_all_pages({'location': 'rivonia', 'limit': '3'}),
                              expected_ids(rivonia))
        self.assertEqual(fetch_all_pages({'status': 'new', 'location': 'rivonia', 'limit': '2'}),
                         expected_ids(rivonia))

    def test_reads_stop_after_max_pages(self):
        TABLE.items = make_incidents(250)
        invoke({'q': 'no such text', 'limit': '1'})
        self.assertEqual(len(TABLE.calls), 3)  # 250 items / 100 per read
        lf.MAX_PAGES, original = 2, lf.MAX_PAGES
        try:
            _, body = invoke({'q': 'no such text', 'limit': '1'})
        finally:
            lf.MAX_PAGES = original
        self.assertEqual(len(TABLE.calls), 2)
        self.assertIn('nextToken', body)


class SeveritySortTests(GetReportsTestCase):
    def ranks(self, body):
        return [lf.SEVERITY_RANK.get(i.get('severity'), len(lf.SEVERITY_RANK))
                for i in body['incidents']]

    def test_most_urgent_first(self):
        _, body = invoke({'sort': 'severity', 'limit': '100'})
        self.assertEqual(self.ranks(body), sorted(self.ranks(body)))
        self.assertEqual(body['incidents'][0]['severity'], 'critical')

    def test_newest_first_within_severity(self):
        _, body = invoke({'sort': 'severity', 'limit': '100'})
        critical = [i['timestamp'] for i in body['incidents'] if i.get('severity') == 'critical']
        self.assertEqual(critical, sorted(critical, reverse=True))

    def test_missing_severity_sorts_last(self):
        _, body = invoke({'sort': 'severity', 'limit': '100'})
        self.assertNotIn('severity', body['incidents'][-1])

    def test_order_asc_reverses(self):
        _, body = invoke({'sort': 'severity', 'order': 'asc', 'limit': '100'})
        self.assertNotIn('severity', body['incidents'][0])
        self.assertEqual(body['incidents'][-1]['severity'], 'critical')


class PaginationTokenTests(GetReportsTestCase):
    def test_limit_is_capped(self):
        invoke({'limit': '999'})
        self.assertEqual(TABLE.calls[0], ('scan', {'ConsistentRead': True, 'Limit': lf.MAX_LIMIT}))

    def test_token_round_trips_decimal_keys(self):
        key = {'incidentId': 'a', 'timestamp': 't', 'score': Decimal('5'), 'ratio': Decimal('0.5')}
        decoded = lf._decode_token(lf._encode_token(key))
        self.assertEqual(decoded, key)
        self.assertIsInstance(decoded['score'], Decimal)
        self.assertIsInstance(decoded['ratio'], Decimal)

    def test_token_is_passed_as_exclusive_start_key(self):
        _, first = invoke({'status': 'new', 'limit': '2'})
        invoke({'status': 'new', 'limit': '2', 'nextToken': first['nextToken']})
        self.assertEqual(TABLE.calls[0][1]['ExclusiveStartKey'],
                         {'incidentId': first['incidents'][-1]['incidentId'],
                          'timestamp': first['incidents'][-1]['timestamp'],
                          'status': 'new'})


class PhotoUrlTests(GetReportsTestCase):
    def photo_view_url(self, photo_url):
        TABLE.items = [dict(make_incidents(1)[0], photoUrl=photo_url)]
        _, body = invoke(None)
        return body['incidents'][0].get('photoViewUrl')

    def test_s3_client_uses_regional_endpoint(self):
        self.assertEqual(S3.client_kwargs['region_name'], 'af-south-1')
        self.assertEqual(S3.client_kwargs['endpoint_url'], 'https://s3.af-south-1.amazonaws.com')

    def test_signs_virtual_hosted_url(self):
        url = self.photo_view_url(
            'https://test-photos.s3.af-south-1.amazonaws.com/photos/id000/abc.jpg')
        self.assertEqual(url, 'https://signed.example/test-photos/photos/id000/abc.jpg?expires=3600')
        self.assertEqual(S3.presigned, [('get_object',
                                         {'Bucket': 'test-photos', 'Key': 'photos/id000/abc.jpg'},
                                         3600)])

    def test_signs_global_and_path_style_urls(self):
        for photo_url in ('https://test-photos.s3.amazonaws.com/photos/a.jpg',
                          'https://s3.af-south-1.amazonaws.com/test-photos/photos/a.jpg',
                          'https://s3.amazonaws.com/test-photos/photos/a.jpg'):
            with self.subTest(photo_url):
                self.assertEqual(self.photo_view_url(photo_url),
                                 'https://signed.example/test-photos/photos/a.jpg?expires=3600')

    def test_decodes_escaped_keys(self):
        url = self.photo_view_url('https://test-photos.s3.af-south-1.amazonaws.com/photos/my%20pic.jpg')
        self.assertEqual(S3.presigned[0][1]['Key'], 'photos/my pic.jpg')
        self.assertIsNotNone(url)

    def test_keeps_stored_photo_url(self):
        photo_url = 'https://test-photos.s3.af-south-1.amazonaws.com/photos/a.jpg'
        TABLE.items = [dict(make_incidents(1)[0], photoUrl=photo_url)]
        _, body = invoke(None)
        self.assertEqual(body['incidents'][0]['photoUrl'], photo_url)

    def test_ignores_urls_outside_our_bucket(self):
        for photo_url in ('https://other-bucket.s3.af-south-1.amazonaws.com/photos/a.jpg',
                          'https://s3.af-south-1.amazonaws.com/other-bucket/a.jpg',
                          'https://s3.af-south-1.amazonaws.com/test-photos-evil/a.jpg',
                          'https://test-photos.s3.af-south-1.amazonaws.com.evil.com/a.jpg',
                          'http://test-photos.s3.af-south-1.amazonaws.com/a.jpg',
                          'https://evil.example/a.jpg',
                          'https://test-photos.s3.af-south-1.amazonaws.com/',
                          'not a url', 42):
            with self.subTest(photo_url):
                self.assertIsNone(self.photo_view_url(photo_url))
        self.assertEqual(S3.presigned, [])

    def test_incidents_without_photos_are_unchanged(self):
        _, body = invoke(None)
        self.assertTrue(all('photoViewUrl' not in i for i in body['incidents']))
        self.assertEqual(S3.presigned, [])

    def test_no_signing_when_bucket_not_configured(self):
        lf.BUCKET_NAME, original = None, lf.BUCKET_NAME
        try:
            url = self.photo_view_url('https://test-photos.s3.af-south-1.amazonaws.com/a.jpg')
        finally:
            lf.BUCKET_NAME = original
        self.assertIsNone(url)


class PhotoUploadTests(GetReportsTestCase):
    # Prefix the todo_2 submit-report lambda requires for photoUrl
    SUBMIT_REPORT_PHOTO_PREFIX = 'https://test-photos.s3'

    def test_returns_presigned_post_and_photo_url(self):
        status, body = invoke({'photoUpload': 'image/jpeg'})
        self.assertEqual(status, 200)
        operation, params, expires = S3.presigned[0]
        self.assertEqual(operation, 'post_object')
        self.assertEqual(expires, 300)
        self.assertRegex(params['Key'], r'^photos/[0-9a-f-]{36}\.jpg$')
        self.assertEqual(body['photoUpload']['fields']['key'], params['Key'])
        self.assertEqual(body['photoUrl'],
                         f"https://test-photos.s3.af-south-1.amazonaws.com/{params['Key']}")
        self.assertEqual(body['maxBytes'], 5 * 1024 * 1024)
        self.assertEqual(TABLE.calls, [])

    def test_upload_enforces_type_and_size(self):
        invoke({'photoUpload': 'image/png'})
        _, params, _ = S3.presigned[0]
        self.assertEqual(params['Fields'], {'Content-Type': 'image/png'})
        self.assertIn({'Content-Type': 'image/png'}, params['Conditions'])
        self.assertIn(['content-length-range', 1, 5 * 1024 * 1024], params['Conditions'])
        self.assertTrue(params['Key'].endswith('.png'))

    def test_each_upload_gets_a_new_key(self):
        _, first = invoke({'photoUpload': 'image/webp'})
        _, second = invoke({'photoUpload': 'image/webp'})
        self.assertNotEqual(first['photoUrl'], second['photoUrl'])

    def test_photo_url_works_with_submit_report_and_photo_view_url(self):
        _, body = invoke({'photoUpload': 'image/jpeg'})
        self.assertTrue(body['photoUrl'].startswith(self.SUBMIT_REPORT_PHOTO_PREFIX))
        self.assertEqual(lf._photo_key(body['photoUrl']), body['photoUpload']['fields']['key'])

    def test_rejects_other_content_types(self):
        for content_type in ('image/gif', 'application/pdf', 'text/html', ''):
            with self.subTest(content_type):
                status, body = invoke({'photoUpload': content_type})
                self.assertEqual(status, 400)
                self.assertEqual(body['error'],
                                 'photoUpload must be one of: image/jpeg, image/png, image/webp')
        self.assertEqual(S3.presigned, [])

    def test_fails_when_bucket_not_configured(self):
        lf.BUCKET_NAME, original = None, lf.BUCKET_NAME
        try:
            status, _ = invoke({'photoUpload': 'image/jpeg'})
        finally:
            lf.BUCKET_NAME = original
        self.assertEqual(status, 500)


class ValidationTests(GetReportsTestCase):
    def test_invalid_params_return_400(self):
        not_a_dict = base64.urlsafe_b64encode(b'[1]').decode()
        cases = {
            'limit not a number': {'limit': 'abc'},
            'limit zero': {'limit': '0'},
            'unknown order': {'order': 'up'},
            'unknown sort': {'sort': 'name'},
            'unknown status': {'status': 'open'},
            'unknown type': {'type': 'murder'},
            'garbage token': {'nextToken': '!!!'},
            'token not an object': {'nextToken': not_a_dict},
        }
        for name, params in cases.items():
            with self.subTest(name):
                status, body = invoke(params)
                self.assertEqual(status, 400)
                self.assertIn('error', body)
                self.assertEqual(TABLE.calls, [])

    def test_error_lists_valid_values(self):
        _, body = invoke({'status': 'open'})
        self.assertEqual(body['error'],
                         'status must be one of: acknowledged, dispatched, new, resolved')


if __name__ == '__main__':
    unittest.main()
