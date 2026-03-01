# Testing Guide - stampchain.io

## Overview

stampchain.io has comprehensive testing at three levels:
1. **Unit Tests**: Fast, isolated tests using MockDatabaseManager (154+ tests, 50+ with mocks)
2. **Integration Tests**: Database connectivity and service integration tests
3. **API Tests**: Newman/Postman tests covering all 46 API endpoints

## Quick Reference

```bash
# Unit testing (fast, no database required)
deno task test:unit              # 154+ tests, 50+ use MockDatabaseManager
deno task test:unit:coverage     # With coverage reports

# Local development environment (MySQL + Redis + Deno app)
deno task test:dev:start         # Start docker-compose.dev.yml services
deno task test:dev:stop          # Stop dev services
deno task test:dev:logs          # View logs
deno task test:dev:restart       # Restart all services

# Integration testing (requires MySQL + Redis)
deno task test:integration       # Database integration tests
deno task test:integration:ci    # CI-safe version with fallbacks

# Newman API testing (requires running dev server)
deno task test:ci:newman-local   # Run Newman against localhost:8000
npm run test:api:smoke           # 3 endpoints, health checks
npm run test:api:comprehensive   # 46 endpoints, full coverage
npm run test:api:performance     # Load testing
```

## MockDatabaseManager

### Overview

The `tests/mocks/mockDatabaseManager.ts` provides a fixture-based mock for unit testing repository classes without a real database.

### Usage Pattern

```typescript
// Example: Testing StampRepository with mock database
import { MockDatabaseManager } from "../mocks/mockDatabaseManager.ts";

const mockDb = new MockDatabaseManager();
const repository = new StampRepository(mockDb as unknown as DatabaseManager);

// MockDatabaseManager returns fixture data from tests/fixtures/
const stamp = await repository.getStampById("1");
// Returns data from tests/fixtures/stampData.json
```

### When to Use MockDatabaseManager

✅ **Use MockDatabaseManager for:**
- Unit tests for repository classes (StampRepository, MarketDataRepository, SRC20Repository)
- Tests that need predictable, repeatable data
- Fast test execution without database overhead
- CI/CD environments where database setup is complex

❌ **Do NOT use MockDatabaseManager for:**
- Integration tests verifying actual database connectivity
- Tests requiring complex SQL queries or joins
- Performance testing of database operations
- Tests verifying database transaction behavior

### Adding New Query Pattern Support

```typescript
// In tests/mocks/mockDatabaseManager.ts

// 1. Add new query pattern matcher
if (query.includes("SELECT * FROM new_table")) {
  return this.fixtures.newTableData || [];
}

// 2. Add fixture data to constructor
this.fixtures = {
  stamps: stampFixtures,
  newTableData: newTableFixtures, // Add new fixture
  // ...
};

// 3. Create fixture file
// tests/fixtures/newTableData.json
```

## Local Development Testing Environment

### Docker Compose Setup

The `docker-compose.dev.yml` provides a complete local testing environment:

```yaml
# Services included:
# - MySQL 8.0 (port 3306)
# - Redis 7 (port 6379)
# - Deno application (port 8000)
```

### Setup and Usage

```bash
# 1. Start all services
deno task test:dev:start

# 2. Wait for services to be healthy (30-60 seconds)
# Check logs: deno task test:dev:logs

# 3. Verify health
curl http://localhost:8000/api/v2/health

# 4. Run Newman tests against local dev
deno task test:ci:newman-local

# 5. Stop services when done
deno task test:dev:stop
```

## CI Testing Approach

GitHub Actions runs three test jobs on every push/PR:

### 1. Unit Tests (`.github/workflows/unit-tests.yml`)

- Runs `deno task test:unit:coverage`
- Uses MockDatabaseManager and fixtures
- No external services required
- Uploads coverage to Codecov

### 2. Integration Tests (`.github/workflows/integration-tests.yml`)

- Starts MySQL + Redis services
- Runs `deno task test:integration:ci`
- Tests DatabaseManager connectivity
- Validates fallback behavior

### 3. Newman Local Dev Tests (`.github/workflows/newman-comprehensive-tests.yml`)

- Starts MySQL + Redis services
- Loads test schema (`scripts/test-schema.sql`)
- Seeds test data (`scripts/test-seed-data.sql`)
- Starts local Deno dev server
- Runs Newman tests against localhost:8000
- Tests all 46 endpoints with real data

## Test Data Management

### Test Fixtures

Test fixtures are located in `tests/fixtures/`:
- `stampData.json` - Sample stamp records
- `marketData.json` - Market data samples
- `src20Data.json` - SRC-20 token data
- `collectionData.json` - Collection metadata

### Database Test Data

Database test data:
- `scripts/test-schema.sql` - Database schema for testing
- `scripts/test-seed-data.sql` - Seed data for Newman tests

### Updating Fixtures

When schema changes, update fixtures to maintain test coverage:

```bash
# 1. Update schema
vim scripts/test-schema.sql

# 2. Update seed data if needed
vim scripts/test-seed-data.sql

# 3. Update JSON fixtures
vim tests/fixtures/stampData.json

# 4. Verify MockDatabaseManager still works
deno task test:unit

# 5. Verify integration tests pass
deno task test:integration
```

## Writing Tests with Mocks

### ✅ Good: Uses MockDatabaseManager for predictable data

```typescript
Deno.test("StampRepository.getStampById returns correct stamp", async () => {
  const mockDb = new MockDatabaseManager();
  const repo = new StampRepository(mockDb as unknown as DatabaseManager);

  const stamp = await repo.getStampById("1");

  assertEquals(stamp?.stamp_id, "1");
  assertEquals(stamp?.creator, "test_creator");
});
```

### ❌ Bad: Uses real database in unit test (slow, fragile)

```typescript
Deno.test("StampRepository.getStampById returns correct stamp", async () => {
  const db = await DatabaseManager.getInstance(); // DON'T DO THIS in unit tests
  const repo = new StampRepository(db);

  const stamp = await repo.getStampById("1"); // Requires database connection
  // ...
});
```

## Test Environment Requirements

- **Unit tests**: `DENO_ENV=test` and `SKIP_REDIS_CONNECTION=true`
- **Integration tests**: `DENO_ENV=test` with MySQL + Redis services
- **Newman tests**: Local dev server running with test database

## Common Testing Patterns

### Testing Repository Classes

```typescript
import { MockDatabaseManager } from "../mocks/mockDatabaseManager.ts";
import { assertEquals } from "@std/assert";

Deno.test("Repository test example", async () => {
  const mockDb = new MockDatabaseManager();
  const repo = new YourRepository(mockDb as unknown as DatabaseManager);

  const result = await repo.yourMethod("param");

  assertEquals(result, expectedValue);
});
```

### Testing API Routes

```typescript
import { handler } from "../routes/api/your-route.ts";
import { assertEquals } from "@std/assert";

Deno.test("API route test example", async () => {
  const req = new Request("http://localhost/api/test");
  const ctx = { params: { id: "1" } };

  const response = await handler.GET(req, ctx);
  const data = await response.json();

  assertEquals(response.status, 200);
  assertEquals(data.success, true);
});
```

### Testing with Redis Cache

```typescript
Deno.test("Cache test example", async () => {
  // Use test environment with SKIP_REDIS_CONNECTION=true
  // Or mock Redis client if needed

  const result = await getCachedData("key");
  assertEquals(result, expectedValue);
});
```

## Newman API Testing

### Running Newman Tests

```bash
# Smoke tests (fast, 3 critical endpoints)
npm run test:api:smoke

# Comprehensive tests (all 46 endpoints)
npm run test:api:comprehensive

# Performance tests (load testing)
npm run test:api:performance

# Local dev environment tests
deno task test:ci:newman-local
```

### Newman Collection Structure

Newman tests are organized by endpoint type:
- Health checks
- Stamp endpoints
- SRC-20 endpoints
- Block explorer endpoints
- Market data endpoints

### Adding New Newman Tests

1. Update Postman collection in `postman/` directory
2. Export updated collection
3. Run tests locally: `npm run test:api:comprehensive`
4. Verify CI passes

## Performance Testing

### Benchmarking

```bash
# Memory monitoring
deno task monitor:memory --url=http://localhost:8000

# Performance monitoring
deno task deploy:benchmark

# Load testing with Newman
npm run test:api:performance
```

### Performance Targets

- API responses < 500ms (cached)
- API responses < 2s (uncached)
- Database queries < 100ms
- Redis hit ratio > 80%
- Memory usage stable (no leaks)

## Troubleshooting Tests

### Unit Tests Failing

```bash
# Run with verbose output
deno task test:unit --v

# Run specific test file
deno test tests/unit/stamps/stampRepository.test.ts

# Check fixture data
cat tests/fixtures/stampData.json
```

### Integration Tests Failing

```bash
# Check database connection
deno task test:dev:logs | grep mysql

# Check Redis connection
deno task test:dev:logs | grep redis

# Restart services
deno task test:dev:restart
```

### Newman Tests Failing

```bash
# Check server is running
curl http://localhost:8000/api/v2/health

# Check test database has data
deno task test:dev:logs | grep "seed data"

# Run with debug output
npm run test:api:comprehensive -- --verbose
```

## Test Coverage

### Generating Coverage Reports

```bash
# Unit test coverage
deno task test:unit:coverage

# View coverage report
open coverage/html/index.html
```

### Coverage Targets

- Overall coverage: > 80%
- Critical paths: > 90%
- Repository classes: > 85%
- API routes: > 80%

## Best Practices

### Do's ✅

- Use MockDatabaseManager for unit tests
- Write tests for new features
- Keep tests fast and isolated
- Use fixtures for predictable data
- Test error paths and edge cases
- Run tests before committing
- Update fixtures when schema changes

### Don'ts ❌

- Don't use real database in unit tests
- Don't skip tests to make CI pass
- Don't test implementation details
- Don't write flaky tests
- Don't commit without running tests
- Don't ignore failing tests

## Additional Resources

- [NEWMAN_TESTING.md](mdc:NEWMAN_TESTING.md) - Detailed Newman testing guide
- [TEST_DATA_STRATEGY.md](mdc:TEST_DATA_STRATEGY.md) - Test data management
- [DAILY_REGRESSION_TESTING.md](mdc:DAILY_REGRESSION_TESTING.md) - Regression testing approach
- [TESTING_GUIDELINES.md](mdc:TESTING_GUIDELINES.md) - General testing guidelines
