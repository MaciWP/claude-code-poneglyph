# N+1 Detection Methods

How to detect N+1 queries during development and testing in Binora.

## 1. Django Query Logging (Development)

Enable SQL logging to see every query in the console:

```python
# settings_test.py or settings_local.py
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "loggers": {
        "django.db.backends": {
            "level": "DEBUG",
            "handlers": ["console"],
        },
    },
}
```

Look for repeated SELECT statements with different WHERE clause values -- that is N+1.

## 2. `assertNumQueries` in Tests

Django's built-in context manager for exact query count assertions:

```python
from django.test.utils import override_settings

@pytest.mark.django_db
class TestAssetListQueries:

    def test_list_assets_query_count(self, api_client_logged):
        with self.assertNumQueries(3):
            api_client_logged.get("/api/assets/")
```

For pytest (without `self`), use `django_assert_num_queries` fixture:

```python
@pytest.mark.django_db
def test_list_assets_query_count(api_client_logged, django_assert_num_queries):
    with django_assert_num_queries(3):
        api_client_logged.get("/api/assets/")
```

## 3. `CaptureQueriesContext` for Detailed Inspection

When you need to see WHAT queries ran, not just how many:

```python
from django.db import connection
from django.test.utils import CaptureQueriesContext

@pytest.mark.django_db
def test_asset_list_no_n_plus_one(api_client_logged):
    with CaptureQueriesContext(connection) as context:
        response = api_client_logged.get("/api/assets/")

    assert response.status_code == 200

    # Print all queries for debugging
    for i, query in enumerate(context.captured_queries):
        print(f"Query {i}: {query['sql'][:120]}")

    # Assert upper bound
    assert len(context) <= 5, (
        f"Expected <= 5 queries, got {len(context)}. "
        f"Likely N+1 -- check select_related/prefetch_related."
    )
```

### Detecting the Pattern

After capturing queries, grep for repeated table access:

```python
from collections import Counter

table_hits = Counter()
for q in context.captured_queries:
    sql = q["sql"]
    if "SELECT" in sql:
        # Extract table name (rough heuristic)
        if "FROM" in sql:
            table = sql.split("FROM")[1].split()[0].strip('"')
            table_hits[table] += 1

for table, count in table_hits.most_common():
    if count > 2:
        print(f"N+1 SUSPECT: {table} hit {count} times")
```

## 4. `connection.queries` Quick Check

For quick ad-hoc debugging (requires `DEBUG=True`):

```python
from django.db import connection, reset_queries

reset_queries()
list(Asset.objects.select_related("product_model").all())
print(f"Queries: {len(connection.queries)}")
for q in connection.queries:
    print(q["sql"][:120])
```

## 5. CLI Detection via pytest Output

Run tests with SQL logging and count SELECT statements:

```bash
# Count SELECTs during a specific test
pytest apps/assets/tests/test_views.py::TestAssetViewSet::test_list -s 2>&1 | grep -c "SELECT"

# Show actual SQL (verbose)
pytest apps/assets/tests/test_views.py -s --log-cli-level=DEBUG 2>&1 | grep "SELECT"
```

## Query Count Targets (Reference)

| Endpoint Type | Target Queries | N+1 Likely If |
|---------------|---------------|---------------|
| Simple list | 1-3 | > 5 |
| List with relations | 2-5 | > 8 |
| Rack list (multi-table) | 2-4 | > 6 |
| Detail with nested | 3-7 | > 10 |

## When to Add Query Count Tests

| Scenario | Add Test? |
|----------|-----------|
| New list endpoint | Yes -- always |
| New serializer with FK fields | Yes |
| Refactoring queryset optimization | Yes -- regression guard |
| Simple create/update | Optional |
