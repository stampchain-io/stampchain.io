#!/usr/bin/env -S deno run --allow-read
/**
 * Response Utility Migration Checker
 *
 * Detects manual `new Response()` usage in route handlers and suggests
 * appropriate utility methods (ApiResponseUtil vs WebResponseUtil).
 *
 * This script helps prevent regression to manual response creation patterns
 * after our standardization migration in Task 22.
 */

const ROUTE_PATTERNS = {
  api: /routes\/api\/.*\.ts$/,
  content: /routes\/(?!api\/).*\.ts$/,
  handler: /routes\/handlers\/.*\.ts$/,
  middleware: /routes\/.*middleware.*\.ts$/,
};

const EXCEPTIONS = [
  // These files are allowed to have manual Response() for specific reasons
  "routes/test/",
  "routes/_middleware.ts", // Complex middleware with custom headers
  "routes/api/v2/stamp/[stamp]/preview.ts", // Binary image processing with specialized headers
];

interface ResponseIssue {
  file: string;
  line: number;
  content: string;
  suggestion: string;
  severity: 'warning' | 'error';
}

async function checkFile(filePath: string): Promise<ResponseIssue[]> {
  const issues: ResponseIssue[] = [];

  try {
    const content = await Deno.readTextFile(filePath);
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Skip comments and strings
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
        continue;
      }

      // Detect manual Response() creation
      const responseMatch = line.match(/new\s+Response\s*\(/);
      if (responseMatch) {
        const suggestion = getSuggestion(filePath, line);
        const severity = isException(filePath) ? 'warning' : 'error';

        issues.push({
          file: filePath,
          line: lineNumber,
          content: line.trim(),
          suggestion,
          severity,
        });
      }
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
  }

  return issues;
}

function getSuggestion(filePath: string, line: string): string {
  // API routes should use ApiResponseUtil
  if (ROUTE_PATTERNS.api.test(filePath)) {
    if (line.includes('status: 404')) {
      return 'Use ApiResponseUtil.notFound("message")';
    } else if (line.includes('status: 400')) {
      return 'Use ApiResponseUtil.badRequest("message")';
    } else if (line.includes('status: 500')) {
      return 'Use ApiResponseUtil.internalError(error, "message")';
    } else if (line.includes('JSON.stringify')) {
      return 'Use ApiResponseUtil.success(data)';
    } else {
      return 'Use ApiResponseUtil.success() or appropriate error method';
    }
  }

  // Content/handler routes should use WebResponseUtil
  if (ROUTE_PATTERNS.content.test(filePath) || ROUTE_PATTERNS.handler.test(filePath)) {
    if (line.includes('status: 301') || line.includes('status: 302')) {
      return 'Use WebResponseUtil.redirect(url, status)';
    } else if (line.includes('text/html')) {
      return 'Use WebResponseUtil.stampResponse(content, "text/html", {binary: false})';
    } else if (line.includes('status: 404')) {
      return 'Use WebResponseUtil.stampNotFound()';
    } else {
      return 'Use WebResponseUtil.success() or appropriate content method';
    }
  }

  return 'Use appropriate utility method (ApiResponseUtil for API routes, WebResponseUtil for content)';
}

function isException(filePath: string): boolean {
  return EXCEPTIONS.some(exception => filePath.includes(exception));
}

async function scanDirectory(dirPath: string): Promise<ResponseIssue[]> {
  const issues: ResponseIssue[] = [];

  try {
    for await (const entry of Deno.readDir(dirPath)) {
      const fullPath = `${dirPath}/${entry.name}`;

      if (entry.isDirectory) {
        // Recursively scan subdirectories
        issues.push(...await scanDirectory(fullPath));
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        // Check TypeScript files (excluding tests)
        issues.push(...await checkFile(fullPath));
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error.message);
  }

  return issues;
}

async function main() {
  console.log('🔍 Scanning for manual Response() usage in route handlers...\n');

  const issues = await scanDirectory('routes');

  if (issues.length === 0) {
    console.log('✅ No manual Response() usage found - all routes use utility methods!\n');
    Deno.exit(0);
  }

  // Group issues by severity
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  if (errors.length > 0) {
    console.log('❌ ERRORS: Manual Response() usage found in route handlers:\n');

    errors.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.file}:${issue.line}`);
      console.log(`   Code: ${issue.content}`);
      console.log(`   💡 Suggestion: ${issue.suggestion}\n`);
    });
  }

  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS: Manual Response() in exception files:\n');

    warnings.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.file}:${issue.line}`);
      console.log(`   Code: ${issue.content}`);
      console.log(`   💡 Consider: ${issue.suggestion}\n`);
    });
  }

  console.log('📊 SUMMARY:');
  console.log(`   Total issues: ${issues.length}`);
  console.log(`   Errors: ${errors.length}`);
  console.log(`   Warnings: ${warnings.length}\n`);

  if (errors.length > 0) {
    console.log('❌ Please fix the errors above before proceeding.');
    console.log('   Use the suggested utility methods for consistent response handling.\n');
    Deno.exit(1);
  } else {
    console.log('✅ No blocking errors found.');
    console.log('   All routes properly use response utilities!\n');
    Deno.exit(0);
  }
}

if (import.meta.main) {
  main();
}
