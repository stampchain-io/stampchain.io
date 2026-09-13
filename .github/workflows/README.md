# GitHub Actions Workflows

## Test Workflows

### Unit Tests with Fixtures (`unit-tests.yml`)

**Purpose**: Run unit tests with mock database and fixture data, no external dependencies.

**Triggers**:
- Every pull request to `main` (no path filter — this is a required status check)

**Features**:
- Uses MockDatabaseManager instead of real database
- Loads test data from `tests/fixtures/`
- Runs with `SKIP_REDIS_CONNECTION=true`
- Generates coverage reports for Codecov
- Verifies all fixtures are available before running

**Test Coverage**:
- Repository unit tests (StampRepository, MarketDataRepository, SRC20Repository, etc.)
- Utility functions
- Service logic without external dependencies

### Integration Tests (`integration-tests.yml`)

**Purpose**: Run integration tests with real MySQL and Redis instances.

**Triggers**:
- Push to `main` when integration tests or server code changes
- Pull requests to `main` with the same file changes
- After unit tests pass (via workflow_run)

**Features**:
- Spins up MySQL 8.0 and Redis 7 containers
- Uses real database connections
- Tests end-to-end functionality
- Generates separate coverage reports

**Test Coverage**:
- Database connections and queries
- Redis caching functionality
- API endpoints
- End-to-end workflows

### Code Quality (`deploy.yml`)

**Purpose**: Main CI workflow for code quality checks and deployment.

**Features**:
- Format and lint checks
- OpenAPI schema validation
- Unit test execution (simplified version)
- Build verification
- Codecov integration

### Fee System Tests (`test-fee-system.yml`)

**Purpose**: Specialized tests for fee calculation and caching systems.

**Features**:
- Tests with Redis (fee-system-tests)
- Tests without Redis (fee-system-fallback-tests)
- BTC price caching tests
- Security and performance tests

### Docker Build Test (`docker-test.yml`)

**Purpose**: Verify Docker image builds successfully.

**Features**:
- Builds Docker image
- Tests container startup
- Runs after Code Quality workflow passes

## Test Organization

### Unit Tests (`tests/unit/`)
- Use dependency injection for repositories
- Mock all external dependencies
- Use fixture data from `tests/fixtures/`
- Fast execution, no network calls

### Integration Tests (`tests/integration/`)
- Use real database and Redis
- Test actual service integration
- May use external APIs (mocked in CI)
- Slower but more comprehensive

### Fixtures (`tests/fixtures/`)
- `stampData.json` - Sample stamp data
- `marketData.json` - Market data samples
- `src20Data.json` - SRC20 transaction data
- `collectionData.json` - Collection data

### Mocks (`tests/mocks/`)
- `mockDatabaseManager.ts` - Mock implementation of DatabaseManager
- Returns fixture data based on query patterns
- Tracks query history for verification

## Running Tests Locally

```bash
# Unit tests
deno task test:unit

# Unit tests with coverage
deno task test:unit:coverage

# Integration tests (requires MySQL/Redis)
deno task test:integration

# All tests
deno task test:all

# Fee system tests
deno task test:fees

# Generate fixtures
deno task test:fixtures
```

## Adding New Tests

1. **Unit Tests**: 
   - Add to `tests/unit/`
   - Use dependency injection pattern
   - Mock external dependencies
   - Use fixtures for test data

2. **Integration Tests**:
   - Add to `tests/integration/`
   - Can use real database/Redis
   - Test full workflows

3. **Update Workflows**:
   - Add new paths to workflow triggers if needed
   - Update test summaries in workflows

## CI Environment Variables

### Common
- `CI=true`
- `DENO_ENV=test`

### Unit Tests
- `SKIP_REDIS_CONNECTION=true`
- Mock API keys provided

### Integration Tests
- Database configuration (DB_HOST, DB_USER, etc.)
- Redis configuration (REDIS_URL)
- Real service endpoints (when needed)

## Troubleshooting

### Unit Test Failures
- Check fixture data matches expected format
- Verify mock responses are configured
- Ensure dependency injection is set up

### Integration Test Failures
- Check database/Redis containers are healthy
- Verify schema is up to date
- Check network connectivity
- Review service configurations 