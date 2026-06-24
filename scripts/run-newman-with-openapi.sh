#!/bin/sh

echo "=== Newman with OpenAPI Contract Testing ==="
echo "Node version:" && node --version
echo "NPM version:" && npm --version

echo "=== Installing Newman and Dependencies ==="
# Install Newman globally if not already available
if ! command -v newman >/dev/null 2>&1; then
  echo "Newman not found, installing globally..."
  npm install -g newman newman-reporter-html newman-reporter-json --no-fund --silent
fi

# Install local dependencies for OpenAPI validation
npm install --no-fund --silent 2>/dev/null || true
echo "Dependencies installed"

echo "=== Checking Dependencies ==="
echo "Newman version:" && newman --version
echo "Node.js version:" && node --version

echo "=== Checking OpenAPI Validator ==="
if [ -f "scripts/newman-openapi-validator.mjs" ]; then
  echo "✅ OpenAPI validator script found"
  USE_OPENAPI_VALIDATOR=true
else
  echo "⚠️  OpenAPI validator not found, will rely on server-side validation headers"
  USE_OPENAPI_VALIDATOR=false
fi

echo "=== Testing Network Connectivity ==="
ping -c 1 host.docker.internal || echo "host.docker.internal not reachable"
wget -q --spider http://host.docker.internal:8000/api/v2/stamps?limit=1 && echo "Development server is reachable" || echo "Development server is NOT reachable"
wget -q --spider https://stampchain.io/api/v2/stamps?limit=1 && echo "Production server is reachable" || echo "Production server is NOT reachable"

echo "=== Preparing Reports Directory ==="
REPORT_DIR="reports/${REPORT_PREFIX:-newman}"
mkdir -p "$REPORT_DIR"
chmod 755 "$REPORT_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
echo "Using timestamp: $TIMESTAMP"
echo "Using collection: ${NEWMAN_COLLECTION:-tests/postman/collections/comprehensive.json}"
echo "Using environment: ${NEWMAN_ENVIRONMENT:-postman-environment.json}"

if [ "$USE_OPENAPI_VALIDATOR" = "true" ] && [ -f "./static/swagger/openapi.yml" ]; then
  echo "=== Running Newman with OpenAPI Contract Validation ==="
  
  # Use our OpenAPI validator script with proper npx
  node scripts/newman-openapi-validator.mjs \
    ./static/swagger/openapi.yml \
    "${NEWMAN_COLLECTION:-tests/postman/collections/comprehensive.json}" \
    "${NEWMAN_ENVIRONMENT:-postman-environment.json}" > $REPORT_DIR/$TIMESTAMP-openapi-validation.log 2>&1
  
  OPENAPI_EXIT_CODE=$?
  
  if [ $OPENAPI_EXIT_CODE -eq 0 ]; then
    echo "✅ OpenAPI validation completed successfully"
  else
    echo "⚠️  OpenAPI validation encountered issues, check log"
  fi
  
  # Also generate standard Newman reports using global newman
  # Build Newman command with proper parameter handling
  NEWMAN_CMD="newman run '${NEWMAN_COLLECTION:-tests/postman/collections/comprehensive.json}' --environment '${NEWMAN_ENVIRONMENT:-postman-environment.json}' --reporters cli,html,json --reporter-html-export $REPORT_DIR/$TIMESTAMP-report.html --reporter-json-export $REPORT_DIR/$TIMESTAMP-results.json"
  
  [ -n "$NEWMAN_FOLDER" ] && NEWMAN_CMD="$NEWMAN_CMD --folder '$NEWMAN_FOLDER'"
  [ -n "$NEWMAN_ITERATIONS" ] && [ "$NEWMAN_ITERATIONS" -gt 0 ] && NEWMAN_CMD="$NEWMAN_CMD --iteration-count $NEWMAN_ITERATIONS"
  [ -n "$NEWMAN_DELAY_REQUEST" ] && [ "$NEWMAN_DELAY_REQUEST" -gt 0 ] && NEWMAN_CMD="$NEWMAN_CMD --delay-request $NEWMAN_DELAY_REQUEST"
  # Use --timeout-request (per request), NOT --timeout (whole collection run).
  # newman's --timeout aborts the ENTIRE run after N ms with "callback timed
  # out", which prevents the JSON reporter from flushing. As the suite grew past
  # ~30s the nightly run was aborted mid-flight, leaving no report for the gate
  # to read — the perpetual-red root cause (#1138).
  [ -n "$NEWMAN_TIMEOUT" ] && [ "$NEWMAN_TIMEOUT" -gt 0 ] && NEWMAN_CMD="$NEWMAN_CMD --timeout-request $NEWMAN_TIMEOUT"
  [ "$NEWMAN_BAIL" = "true" ] && NEWMAN_CMD="$NEWMAN_CMD --bail"
  [ "$NEWMAN_VERBOSE" = "true" ] && NEWMAN_CMD="$NEWMAN_CMD --verbose"
  [ -n "$DEV_BASE_URL" ] && NEWMAN_CMD="$NEWMAN_CMD --env-var 'dev_base_url=$DEV_BASE_URL'"
  [ -n "$PROD_BASE_URL" ] && NEWMAN_CMD="$NEWMAN_CMD --env-var 'prod_base_url=$PROD_BASE_URL'"
  [ -n "$DEV_BASE_URL" ] && NEWMAN_CMD="$NEWMAN_CMD --env-var 'baseUrl=$DEV_BASE_URL' --env-var 'base_url=$DEV_BASE_URL'"

  eval $NEWMAN_CMD
  NEWMAN_EXIT_CODE=$?

else
  echo "=== Running Standard Newman Tests ==="
  echo "⚠️  OpenAPI validation will depend on server-side headers only"

  # Build Newman command with proper parameter handling
  NEWMAN_CMD="newman run '${NEWMAN_COLLECTION:-tests/postman/collections/comprehensive.json}' --environment '${NEWMAN_ENVIRONMENT:-postman-environment.json}' --reporters cli,html,json --reporter-html-export $REPORT_DIR/$TIMESTAMP-report.html --reporter-json-export $REPORT_DIR/$TIMESTAMP-results.json"

  [ -n "$NEWMAN_FOLDER" ] && NEWMAN_CMD="$NEWMAN_CMD --folder '$NEWMAN_FOLDER'"
  [ -n "$NEWMAN_ITERATIONS" ] && [ "$NEWMAN_ITERATIONS" -gt 0 ] && NEWMAN_CMD="$NEWMAN_CMD --iteration-count $NEWMAN_ITERATIONS"
  [ -n "$NEWMAN_DELAY_REQUEST" ] && [ "$NEWMAN_DELAY_REQUEST" -gt 0 ] && NEWMAN_CMD="$NEWMAN_CMD --delay-request $NEWMAN_DELAY_REQUEST"
  # Use --timeout-request (per request), NOT --timeout (whole collection run).
  # newman's --timeout aborts the ENTIRE run after N ms with "callback timed
  # out", which prevents the JSON reporter from flushing. As the suite grew past
  # ~30s the nightly run was aborted mid-flight, leaving no report for the gate
  # to read — the perpetual-red root cause (#1138).
  [ -n "$NEWMAN_TIMEOUT" ] && [ "$NEWMAN_TIMEOUT" -gt 0 ] && NEWMAN_CMD="$NEWMAN_CMD --timeout-request $NEWMAN_TIMEOUT"
  [ "$NEWMAN_BAIL" = "true" ] && NEWMAN_CMD="$NEWMAN_CMD --bail"
  [ "$NEWMAN_VERBOSE" = "true" ] && NEWMAN_CMD="$NEWMAN_CMD --verbose"
  [ -n "$DEV_BASE_URL" ] && NEWMAN_CMD="$NEWMAN_CMD --env-var 'dev_base_url=$DEV_BASE_URL'"
  [ -n "$PROD_BASE_URL" ] && NEWMAN_CMD="$NEWMAN_CMD --env-var 'prod_base_url=$PROD_BASE_URL'"
  [ -n "$DEV_BASE_URL" ] && NEWMAN_CMD="$NEWMAN_CMD --env-var 'baseUrl=$DEV_BASE_URL' --env-var 'base_url=$DEV_BASE_URL'"

  eval $NEWMAN_CMD
  NEWMAN_EXIT_CODE=$?
fi

echo "=== Test Execution Complete ==="

# --- Authoritative pass/fail marker (read by the CI scheduled-regression gate) ---
# newman's CLI exit code is non-zero on ANY non-2xx response even when every
# assertion passes, so it cannot gate on its own. The host-side gate needs a
# trustworthy signal that (a) survives the bind mount (shell-redirected files do)
# and (b) distinguishes "API regression" (assertion failures) from "infra failure"
# (no report written at all). We derive it here, inside the container, from the
# actual Newman results JSON. See #1138.
RESULTS_JSON="$REPORT_DIR/$TIMESTAMP-results.json"
STATUS_FILE="$REPORT_DIR/$TIMESTAMP-STATUS.txt"
if [ -f "$RESULTS_JSON" ]; then
  ASSERTION_FAILURES=$(node -e "
    const fs = require('fs');
    try {
      const r = JSON.parse(fs.readFileSync('$RESULTS_JSON', 'utf8'));
      process.stdout.write(String(r.run?.stats?.assertions?.failed ?? -1));
    } catch (e) { process.stdout.write('-1'); }
  " 2>/dev/null || echo "-1")
  if [ "$ASSERTION_FAILURES" = "0" ]; then
    echo "PASS 0" > "$STATUS_FILE"
    echo "✅ STATUS: PASS (0 assertion failures)"
  elif [ "$ASSERTION_FAILURES" = "-1" ]; then
    echo "NOREPORT unparseable" > "$STATUS_FILE"
    echo "⚠️  STATUS: NOREPORT (results JSON present but unparseable)"
  else
    echo "REGRESSION $ASSERTION_FAILURES" > "$STATUS_FILE"
    echo "❌ STATUS: REGRESSION ($ASSERTION_FAILURES assertion failure(s))"
  fi
else
  # Newman never wrote a report — an infrastructure failure, NOT an API regression.
  echo "NOREPORT missing" > "$STATUS_FILE"
  echo "⚠️  STATUS: NOREPORT (Newman produced no results JSON — infra failure, not a regression)"
fi

# Check for validation headers in responses
if [ -f "$REPORT_DIR/$TIMESTAMP-results.json" ]; then
  echo "=== Checking for OpenAPI Validation Headers ==="
  node -e "
    const fs = require('fs');
    const results = JSON.parse(fs.readFileSync('$REPORT_DIR/$TIMESTAMP-results.json', 'utf8'));
    let validatedCount = 0;
    let failedCount = 0;
    
    results.run.executions.forEach(exec => {
      const headers = exec.response?.headers?.members || [];
      const validated = headers.find(h => h.key === 'X-Schema-Validated');
      if (validated) {
        validatedCount++;
        if (validated.value === 'false') failedCount++;
      }
    });
    
    console.log(\`✅ Responses with schema validation: \${validatedCount}\`);
    if (failedCount > 0) {
      console.log(\`❌ Failed schema validations: \${failedCount}\`);
      process.exit(1);
    }
  " || echo "Could not check validation headers"
fi

# Generate summary report (report files only claimed when they actually exist)
echo "=== Summary ==="
echo "📁 Reports directory: $REPORT_DIR/"
if [ -f "$REPORT_DIR/$TIMESTAMP-results.json" ]; then
  echo "📊 JSON Results: $REPORT_DIR/$TIMESTAMP-results.json"
else
  echo "⚠️  JSON Results: NOT written (Newman produced no report)"
fi
[ -f "$REPORT_DIR/$TIMESTAMP-report.html" ] && echo "📄 HTML Report: $REPORT_DIR/$TIMESTAMP-report.html"
[ -f "$REPORT_DIR/$TIMESTAMP-openapi-validation.log" ] && echo "🔍 OpenAPI Validation: $REPORT_DIR/$TIMESTAMP-openapi-validation.log"
[ -f "$STATUS_FILE" ] && echo "🚦 Status marker: $(cat "$STATUS_FILE")"

exit $NEWMAN_EXIT_CODE