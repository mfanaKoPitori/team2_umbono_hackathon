"""In-memory stand-ins for boto3/botocore, so lambdas can be tested without AWS.

`install()` registers fake `boto3`, `boto3.dynamodb.conditions` and
`botocore.exceptions` modules. The fake table mimics the DynamoDB behaviour
the lambdas rely on: `Limit` counts items evaluated before filtering,
`LastEvaluatedKey` is returned while more items remain, and querying a
missing index raises a ValidationException.
"""
import sys
import types

TABLE_KEYS = ('incidentId', 'timestamp')
STATUS_INDEX_KEYS = ('incidentId', 'timestamp', 'status')


class ClientError(Exception):
    def __init__(self, error_response, operation_name):
        self.response = error_response
        super().__init__(error_response['Error']['Message'])


class Condition:
    def __init__(self, predicate):
        self.predicate = predicate

    def __and__(self, other):
        return Condition(lambda item: self(item) and other(item))

    def __call__(self, item):
        return self.predicate(item)


class Attribute:
    def __init__(self, name):
        self.name = name

    def eq(self, value):
        return Condition(lambda item: item.get(self.name) == value)


class FakeTable:
    def __init__(self):
        self.items = []
        self.calls = []
        self.has_index = True

    def query(self, **kwargs):
        self.calls.append(('query', kwargs))
        if not self.has_index:
            raise ClientError({'Error': {'Code': 'ValidationException',
                                         'Message': 'The table does not have the specified index'}},
                              'Query')
        rows = [i for i in self.items if kwargs['KeyConditionExpression'](i)]
        rows.sort(key=lambda i: i['timestamp'], reverse=not kwargs.get('ScanIndexForward', True))
        return self._page(rows, kwargs, STATUS_INDEX_KEYS)

    def scan(self, **kwargs):
        self.calls.append(('scan', kwargs))
        return self._page(list(self.items), kwargs, TABLE_KEYS)

    def _page(self, rows, kwargs, key_attrs):
        start = 0
        start_key = kwargs.get('ExclusiveStartKey')
        if start_key:
            assert set(start_key) == set(key_attrs), f'bad ExclusiveStartKey {start_key}'
            start = next(n for n, r in enumerate(rows)
                         if all(r[k] == start_key[k] for k in key_attrs)) + 1
        evaluated = rows[start:start + kwargs['Limit']]
        keep = kwargs.get('FilterExpression') or (lambda item: True)
        response = {'Items': [dict(i) for i in evaluated if keep(i)]}
        if start + kwargs['Limit'] < len(rows):
            response['LastEvaluatedKey'] = {k: evaluated[-1][k] for k in key_attrs}
        return response


TABLE = FakeTable()


def install():
    boto3 = types.ModuleType('boto3')
    boto3.resource = lambda name: types.SimpleNamespace(Table=lambda table_name: TABLE)
    dynamodb = types.ModuleType('boto3.dynamodb')
    conditions = types.ModuleType('boto3.dynamodb.conditions')
    conditions.Attr = conditions.Key = Attribute
    botocore = types.ModuleType('botocore')
    exceptions = types.ModuleType('botocore.exceptions')
    exceptions.ClientError = ClientError
    sys.modules.update({
        'boto3': boto3,
        'boto3.dynamodb': dynamodb,
        'boto3.dynamodb.conditions': conditions,
        'botocore': botocore,
        'botocore.exceptions': exceptions,
    })
