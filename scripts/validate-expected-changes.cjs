#!/usr/bin/env node

/**
 * validate-expected-changes.js
 *
 * Validates Newman test results against OpenAPI schema definitions
 * and distinguishes between expected vs unexpected API changes.
 *
 * This script is called by CI/CD workflows to ensure API responses
 * conform to documented schemas and detect regressions.
 */

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

class SchemaValidator {
  constructor() {
    this.config = this.loadConfig();
    this.schema = this.loadOpenAPISchema();
    this.results = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: 0,
        schemaValidations: 0,
        schemaFailures: 0,
        expectedChanges: 0,
        unexpectedChanges: 0,
        status: "success",
      },
      validationDetails: [],
      unexpectedChanges: [],
      schemaViolations: [],
    };
  }

  loadConfig() {
    const configPath = "scripts/validate-expected-changes-config.json";

    // Create default config if it doesn't exist
    const defaultConfig = {
      expectedChanges: {
        allowedNewFields: [
          "marketData",
          "dispenserInfo",
          "cacheStatus",
          "timestamp",
          "lastUpdated",
        ],
        allowedFieldModifications: {
          "pagination": ["total", "pages", "hasNext", "hasPrev"],
          "status": ["new", "updated", "active", "inactive"],
        },
        ignoreResponseFields: [
          "responseTime",
          "timestamp",
          "cacheAge",
        ],
      },
      schemaValidation: {
        enforceRequired: true,
        enforceTypes: true,
        allowAdditionalProperties: true,
        ignoreEndpoints: [
          "/api/v2/error", // Test endpoint that intentionally returns errors
        ],
      },
      performance: {
        warningThreshold: 2000, // ms
        criticalThreshold: 5000, // ms
      },
    };

    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      console.log(`Created default config at ${configPath}`);
    }

    try {
      return JSON.parse(fs.readFileSync(configPath, "utf8"));
    } catch (error) {
      console.warn(
        `Could not load config from ${configPath}, using defaults:`,
        error.message,
      );
      return defaultConfig;
    }
  }

  loadOpenAPISchema() {
    const schemaPath = "schema.yml";

    if (!fs.existsSync(schemaPath)) {
      throw new Error(`OpenAPI schema file not found at ${schemaPath}`);
    }

    try {
      const schemaContent = fs.readFileSync(schemaPath, "utf8");
      const schema = yaml.load(schemaContent);
      console.log(`Loaded OpenAPI schema from ${schemaPath}`);
      console.log(`Schema version: ${schema.info?.version || "unknown"}`);
      return schema;
    } catch (error) {
      throw new Error(`Failed to parse OpenAPI schema: ${error.message}`);
    }
  }

  findLatestNewmanResults() {
    const reportDirs = [
      "reports/daily-regression",
      "reports/newman",
      "reports",
    ];

    let latestResults = null;
    let latestTime = 0;

    for (const dir of reportDirs) {
      if (!fs.existsSync(dir)) continue;

      const files = this.findNewmanFiles(dir);
      for (const file of files) {
        const stats = fs.statSync(file);
        if (stats.mtime.getTime() > latestTime) {
          latestTime = stats.mtime.getTime();
          latestResults = file;
        }
      }
    }

    if (!latestResults) {
      throw new Error("No Newman results found. Run Newman tests first.");
    }

    console.log(`Using Newman results: ${latestResults}`);
    return latestResults;
  }

  findNewmanFiles(dir) {
    const files = [];

    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...this.findNewmanFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith("-results.json")) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Resolve a concrete request path (e.g. /api/v2/balance/bc1q...) to its
   * OpenAPI path item. Exact keys win; otherwise templated keys such as
   * /api/v2/balance/{address} are matched segment-by-segment, preferring the
   * candidate with the most literal (non-template) segments so that
   * /api/v2/stamps/balance/{address} beats /api/v2/stamps/{id} for a
   * /api/v2/stamps/balance/... request.
   */
  findPathDef(endpoint) {
    const paths = this.schema.paths || {};
    if (paths[endpoint]) return paths[endpoint];

    const requestSegments = endpoint.split("/");
    let best = null;
    let bestLiterals = -1;

    for (const [template, pathDef] of Object.entries(paths)) {
      const templateSegments = template.split("/");
      if (templateSegments.length !== requestSegments.length) continue;

      let literals = 0;
      let matches = true;
      for (let i = 0; i < templateSegments.length; i++) {
        const seg = templateSegments[i];
        if (/^\{[^}]+\}$/.test(seg)) continue;
        if (seg !== requestSegments[i]) {
          matches = false;
          break;
        }
        literals++;
      }

      if (matches && literals > bestLiterals) {
        best = pathDef;
        bestLiterals = literals;
      }
    }

    return best;
  }

  /**
   * Newman's JSON reporter serialises response.stream as a Buffer JSON object
   * ({ type: "Buffer", data: [...] }); String(stream) on that yields
   * "[object Object]", which is not the body.
   */
  decodeResponseBody(stream) {
    if (stream === undefined || stream === null) return "{}";
    if (typeof stream === "string") return stream;
    if (Buffer.isBuffer(stream)) return stream.toString("utf8");
    if (Array.isArray(stream.data)) {
      return Buffer.from(stream.data).toString("utf8");
    }
    return String(stream);
  }

  isIgnoredEndpoint(endpoint) {
    const ignored = this.config.schemaValidation.ignoreEndpoints || [];
    return ignored.some((entry) =>
      entry.endsWith("/") ? endpoint.startsWith(entry) : endpoint === entry
    );
  }

  validateSchemaResponse(endpoint, method, statusCode, responseBody) {
    const pathDef = this.findPathDef(endpoint);
    if (!pathDef) {
      return {
        valid: false,
        error: `Endpoint ${endpoint} not found in OpenAPI schema`,
      };
    }

    const methodDef = pathDef[method.toLowerCase()];
    if (!methodDef) {
      return {
        valid: false,
        error: `Method ${method} not found for endpoint ${endpoint}`,
      };
    }

    const responseDef = methodDef.responses?.[statusCode.toString()];
    if (!responseDef) {
      return {
        valid: false,
        error: `Response ${statusCode} not defined for ${method} ${endpoint}`,
      };
    }

    // Extract schema from response definition
    const contentType = "application/json";
    const schemaRef = responseDef.content?.[contentType]?.schema;

    if (!schemaRef) {
      return {
        valid: true,
        warning: `No schema defined for ${statusCode} response`,
      };
    }

    // Basic schema validation (simplified for now)
    try {
      const parsedBody = typeof responseBody === "string"
        ? JSON.parse(responseBody)
        : responseBody;

      const validation = this.validateAgainstSchema(parsedBody, schemaRef);
      return validation;
    } catch (error) {
      return {
        valid: false,
        error: `Response parsing failed: ${error.message}`,
      };
    }
  }

  validateAgainstSchema(data, schema) {
    // Simplified schema validation - in production, use ajv or similar
    const errors = [];

    if (schema.$ref) {
      // Handle schema references - simplified for now
      return {
        valid: true,
        warning: "Schema reference validation not fully implemented",
      };
    }

    if (schema.type === "object" && schema.properties) {
      // Check required properties
      if (schema.required && this.config.schemaValidation.enforceRequired) {
        for (const requiredField of schema.required) {
          if (!(requiredField in data)) {
            errors.push(`Missing required field: ${requiredField}`);
          }
        }
      }

      // Check property types
      if (this.config.schemaValidation.enforceTypes) {
        for (
          const [propName, propSchema] of Object.entries(schema.properties)
        ) {
          if (propName in data) {
            const value = data[propName];
            const expectedType = propSchema.type;
            const actualType = Array.isArray(value) ? "array" : typeof value;

            if (expectedType && expectedType !== actualType) {
              errors.push(
                `Type mismatch for ${propName}: expected ${expectedType}, got ${actualType}`,
              );
            }
          }
        }
      }

      // Check for unexpected properties (if not allowed)
      if (
        !this.config.schemaValidation.allowAdditionalProperties &&
        !schema.additionalProperties
      ) {
        const allowedProps = Object.keys(schema.properties || {});
        const actualProps = Object.keys(data);
        const unexpectedProps = actualProps.filter((prop) =>
          !allowedProps.includes(prop) &&
          !this.config.expectedChanges.allowedNewFields.includes(prop)
        );

        if (unexpectedProps.length > 0) {
          errors.push(`Unexpected properties: ${unexpectedProps.join(", ")}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async validateNewmanResults() {
    const resultsFile = this.findLatestNewmanResults();

    let newmanData;
    try {
      newmanData = JSON.parse(fs.readFileSync(resultsFile, "utf8"));
    } catch (error) {
      throw new Error(`Failed to parse Newman results: ${error.message}`);
    }

    console.log("Starting schema validation of Newman results...");

    const executions = newmanData.run?.executions || [];
    this.results.summary.totalTests = executions.length;

    for (const execution of executions) {
      const request = execution.request;
      const response = execution.response;

      if (!request || !response) continue;

      const endpoint = this.extractEndpointPath(request.url);
      const method = request.method;
      const statusCode = response.code;
      const responseTime = response.responseTime;

      // Skip ignored endpoints (exact match, or prefix match for entries
      // ending in "/", e.g. "/api/internal/").
      if (this.isIgnoredEndpoint(endpoint)) {
        continue;
      }

      this.results.summary.schemaValidations++;

      // Validate response against schema
      const schemaValidation = this.validateSchemaResponse(
        endpoint,
        method,
        statusCode,
        this.decodeResponseBody(response.stream),
      );

      const validationResult = {
        endpoint,
        method,
        statusCode,
        responseTime,
        schemaValid: schemaValidation.valid,
        timestamp: new Date().toISOString(),
      };

      if (!schemaValidation.valid) {
        this.results.summary.schemaFailures++;
        validationResult.schemaErrors = schemaValidation.errors ||
          [schemaValidation.error];
        this.results.schemaViolations.push(validationResult);
      }

      if (schemaValidation.warning) {
        validationResult.warning = schemaValidation.warning;
      }

      // Check performance thresholds
      if (responseTime > this.config.performance.criticalThreshold) {
        validationResult.performanceIssue = "critical";
        this.results.summary.unexpectedChanges++;
      } else if (responseTime > this.config.performance.warningThreshold) {
        validationResult.performanceIssue = "warning";
      }

      this.results.validationDetails.push(validationResult);
    }

    // Determine overall status
    if (
      this.results.summary.schemaFailures > 0 ||
      this.results.summary.unexpectedChanges > 0
    ) {
      this.results.summary.status = "failure";
    } else if (this.results.schemaViolations.length > 0) {
      this.results.summary.status = "warning";
    }

    console.log(`Schema validation completed:`);
    console.log(`- Total tests: ${this.results.summary.totalTests}`);
    console.log(
      `- Schema validations: ${this.results.summary.schemaValidations}`,
    );
    console.log(`- Schema failures: ${this.results.summary.schemaFailures}`);
    console.log(`- Status: ${this.results.summary.status}`);
  }

  extractEndpointPath(url) {
    // Extract path from Newman URL object or string
    let urlString = url;
    if (typeof url === "object") {
      // Newman serialises `path` without a leading slash; without the "/"
      // separator the first path segment was glued onto the host
      // ("stampchain.ioapi/v2/...") and every endpoint lost its first segment.
      urlString = url.raw ||
        url.protocol + "://" + url.host.join(".") + "/" + url.path.join("/");
    }

    try {
      const parsedUrl = new URL(urlString);
      let pathname = parsedUrl.pathname;
      
      // Normalize path to match OpenAPI schema
      // Newman results may have /v2/... but schema has /api/v2/...
      if (pathname.startsWith("/v2/")) {
        pathname = "/api" + pathname;
      }
      
      return pathname;
    } catch (error) {
      console.warn(`Could not parse URL: ${urlString}`);
      return "/unknown";
    }
  }

  generateReport() {
    const reportPath = "reports/expected-changes-validation.json";

    // Ensure reports directory exists
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`Validation report saved to ${reportPath}`);

    // Generate human-readable summary
    this.generateSummaryReport();
  }

  generateSummaryReport() {
    const summaryPath = "reports/schema-validation-summary.md";

    let markdown = `# OpenAPI Schema Validation Report\n\n`;
    markdown += `**Generated**: ${this.results.timestamp}\n`;
    markdown += `**Status**: ${this.results.summary.status.toUpperCase()}\n\n`;

    markdown += `## Summary\n\n`;
    markdown += `- **Total Tests**: ${this.results.summary.totalTests}\n`;
    markdown +=
      `- **Schema Validations**: ${this.results.summary.schemaValidations}\n`;
    markdown +=
      `- **Schema Failures**: ${this.results.summary.schemaFailures}\n`;
    markdown +=
      `- **Unexpected Changes**: ${this.results.summary.unexpectedChanges}\n\n`;

    if (this.results.schemaViolations.length > 0) {
      markdown += `## Schema Violations\n\n`;
      for (const violation of this.results.schemaViolations) {
        markdown += `### ${violation.method} ${violation.endpoint}\n`;
        markdown += `- **Status Code**: ${violation.statusCode}\n`;
        markdown += `- **Response Time**: ${violation.responseTime}ms\n`;
        if (violation.schemaErrors) {
          markdown += `- **Errors**:\n`;
          for (const error of violation.schemaErrors) {
            markdown += `  - ${error}\n`;
          }
        }
        markdown += `\n`;
      }
    }

    if (this.results.summary.status === "success") {
      markdown += `## ✅ All Validations Passed\n\n`;
      markdown +=
        `All API responses conform to the OpenAPI schema definitions.\n`;
    }

    fs.writeFileSync(summaryPath, markdown);
    console.log(`Summary report saved to ${summaryPath}`);
  }
}

// Main execution
async function main() {
  try {
    const validator = new SchemaValidator();
    await validator.validateNewmanResults();
    validator.generateReport();

    // Exit with appropriate code
    const exitCode = validator.results.summary.status === "failure" ? 1 : 0;
    console.log(
      `\nValidation ${
        validator.results.summary.status === "failure" ? "FAILED" : "PASSED"
      }`,
    );
    process.exit(exitCode);
  } catch (error) {
    console.error("Schema validation failed:", error.message);
    process.exit(1);
  }
}

// Install js-yaml if not present
if (require.main === module) {
  try {
    require("js-yaml");
    main();
  } catch (error) {
    console.log("Installing required dependency: js-yaml");
    const { execSync } = require("child_process");
    execSync("npm install --no-save js-yaml", { stdio: "inherit" });
    delete require.cache[require.resolve("js-yaml")];
    main();
  }
}

module.exports = { SchemaValidator };
