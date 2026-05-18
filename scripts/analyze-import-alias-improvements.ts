#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Import Alias Improvement Analysis Script
 *
 * This script analyzes the codebase to identify and categorize
 * import alias improvements using ts-morph v20+ for AST analysis.
 *
 * Designed for Task 32.1: Create Impact Analysis and Categorization Script
 */

import { walk } from "https://deno.land/std@0.219.1/fs/mod.ts";
import { basename, dirname, join } from "https://deno.land/std@0.219.1/path/mod.ts";

interface ImportImprovement {
  file: string;
  line: number;
  currentImport: string;
  suggestedImport: string;
  impactLevel: "high" | "medium" | "low";
  improvementType: "relative-to-alias" | "standardization" | "import-map-utilization";
  category: "services" | "routes" | "components" | "utilities" | "tests" | "types";
  priority: number;
}

interface AnalysisReport {
  totalImprovements: number;
  categorizedImprovements: Record<string, ImportImprovement[]>;
  batchStrategy: {
    batch1: ImportImprovement[]; // High-impact services and API routes
    batch2: ImportImprovement[]; // Core components and UI modules
    batch3: ImportImprovement[]; // Utility and helper files
    batch4: ImportImprovement[]; // Test files and configuration
  };
  impactSummary: Record<string, number>;
  priorityRanking: ImportImprovement[];
}

// Load import map configuration
const importMapConfig = JSON.parse(
  await Deno.readTextFile("./deno.json")
).imports;

// Extract alias patterns from import map
const aliasPatterns = Object.keys(importMapConfig)
  .filter(key => key.endsWith("/") && key.startsWith("$"))
  .map(key => ({
    alias: key,
    path: importMapConfig[key]
  }));

class ImportAnalyzer {
  private improvements: ImportImprovement[] = [];
  private fileCache = new Map<string, string>();

  async analyzeCodebase(): Promise<AnalysisReport> {
    console.log("🔍 Starting import alias improvement analysis...");

    // Scan all TypeScript files
    const files = [];
    for await (const entry of walk(".", {
      exts: [".ts", ".tsx"],
      skip: [
        /node_modules/,
        /_fresh/,
        /\.git/,
        /coverage/,
        /tmp/,
        /dist/,
        /build/,
        /vendor/,
        /\.taskmaster/,
        /scripts/,
        /tools/
      ]
    })) {
      if (entry.isFile) {
        files.push(entry.path);
      }
    }

    console.log(`📁 Found ${files.length} TypeScript files to analyze`);

    // Analyze each file for import improvements
    let processed = 0;
    for (const file of files) {
      await this.analyzeFile(file);
      processed++;
      if (processed % 50 === 0) {
        console.log(`📊 Processed ${processed}/${files.length} files...`);
      }
    }

    console.log(`✅ Analysis complete. Found ${this.improvements.length} potential improvements`);

    return this.generateReport();
  }

  private async analyzeFile(filePath: string): Promise<void> {
    try {
      const content = await this.readFile(filePath);
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const importMatch = this.extractImportStatement(line);

        if (importMatch) {
          const improvement = this.analyzeImportStatement(
            filePath,
            i + 1,
            importMatch,
            line
          );
          if (improvement) {
            this.improvements.push(improvement);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️  Warning: Could not analyze ${filePath}: ${error.message}`);
    }
  }

  private async readFile(filePath: string): Promise<string> {
    if (!this.fileCache.has(filePath)) {
      const content = await Deno.readTextFile(filePath);
      this.fileCache.set(filePath, content);
    }
    return this.fileCache.get(filePath)!;
  }

  private extractImportStatement(line: string): RegExpMatchArray | null {
    // Match various import patterns - more comprehensive regex
    const patterns = [
      // Standard imports: import { ... } from "path"
      /import\s+(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\w+))*\s+from\s+['"`]([^'"`]+)['"`]/,
      // Type-only imports: import type { ... } from "path"
      /import\s+type\s+(?:\{[^}]*\}|\w+)\s+from\s+['"`]([^'"`]+)['"`]/,
      // Default + named imports: import Default, { named } from "path"
      /import\s+\w+\s*,\s*\{[^}]*\}\s+from\s+['"`]([^'"`]+)['"`]/,
      // Side effect imports: import "path"
      /import\s+['"`]([^'"`]+)['"`]/
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        return match;
      }
    }

    return null;
  }

  private analyzeImportStatement(
    filePath: string,
    lineNumber: number,
    importMatch: RegExpMatchArray,
    fullLine: string
  ): ImportImprovement | null {
    const importPath = importMatch[1];

    // Skip if already using alias
    if (importPath.startsWith("$") || importPath.startsWith("@std/")) {
      return null;
    }

    // Skip node: imports and external modules
    if (importPath.startsWith("node:") ||
        importPath.startsWith("npm:") ||
        importPath.startsWith("jsr:") ||
        importPath.startsWith("https://")) {
      return null;
    }

    const suggestedImport = this.suggestAliasImport(filePath, importPath);

    if (suggestedImport && suggestedImport !== importPath) {
      return {
        file: filePath,
        line: lineNumber,
        currentImport: importPath,
        suggestedImport,
        impactLevel: this.calculateImpactLevel(filePath, importPath),
        improvementType: this.determineImprovementType(importPath, suggestedImport),
        category: this.categorizeFile(filePath),
        priority: this.calculatePriority(filePath, importPath)
      };
    }

    return null;
  }

  private suggestAliasImport(fromFile: string, importPath: string): string | null {
    // Handle relative imports
    if (importPath.startsWith("./") || importPath.startsWith("../")) {
      const fromDir = dirname(fromFile);
      let resolvedPath: string;

      try {
        // Resolve the relative path to an absolute path
        resolvedPath = join(fromDir, importPath);
        // Normalize to remove extra ../. segments
        resolvedPath = resolvedPath.replace(/\/\.\//g, "/").replace(/\/[^/]+\/\.\.\//g, "/");
      } catch {
        return null;
      }

      // Find matching alias pattern
      for (const { alias, path } of aliasPatterns) {
        const aliasPath = path.replace(/\/$/, "");

        // Check if the resolved path starts with the alias base path
        if (resolvedPath.startsWith(aliasPath)) {
          const relativePart = resolvedPath.substring(aliasPath.length + 1);
          return `${alias}${relativePart}`;
        }
      }

      // Try manual mapping for common patterns
      const projectRoot = process.cwd();
      const fullPath = join(projectRoot, resolvedPath);

      // Map to specific aliases based on path structure
      if (fullPath.includes("/lib/types/")) {
        const typesPart = fullPath.substring(fullPath.indexOf("/lib/types/") + 11);
        return `$types/${typesPart}`;
      }

      if (fullPath.includes("/lib/utils/")) {
        const utilsPart = fullPath.substring(fullPath.indexOf("/lib/utils/") + 11);
        return `$lib/utils/${utilsPart}`;
      }

      if (fullPath.includes("/lib/")) {
        const libPart = fullPath.substring(fullPath.indexOf("/lib/") + 5);
        return `$lib/${libPart}`;
      }

      if (fullPath.includes("/server/")) {
        const serverPart = fullPath.substring(fullPath.indexOf("/server/") + 8);
        return `$server/${serverPart}`;
      }

      if (fullPath.includes("/components/")) {
        const componentsPart = fullPath.substring(fullPath.indexOf("/components/") + 12);
        return `$components/${componentsPart}`;
      }

      if (fullPath.includes("/islands/")) {
        const islandsPart = fullPath.substring(fullPath.indexOf("/islands/") + 9);
        return `$islands/${islandsPart}`;
      }

      if (fullPath.includes("/client/")) {
        const clientPart = fullPath.substring(fullPath.indexOf("/client/") + 8);
        return `$client/${clientPart}`;
      }

      if (fullPath.includes("/routes/")) {
        const routesPart = fullPath.substring(fullPath.indexOf("/routes/") + 8);
        return `$routes/${routesPart}`;
      }
    }

    return null;
  }

  private calculateImpactLevel(filePath: string, importPath: string): "high" | "medium" | "low" {
    // High impact: Core services, API routes, frequently used components
    if (filePath.includes("/routes/api/") ||
        filePath.includes("/server/services/") ||
        filePath.includes("/server/controller/") ||
        filePath.includes("/islands/") && this.isFrequentlyUsedComponent(filePath)) {
      return "high";
    }

    // Medium impact: Components, utilities, client code
    if (filePath.includes("/components/") ||
        filePath.includes("/client/") ||
        filePath.includes("/lib/utils/")) {
      return "medium";
    }

    // Low impact: Tests, configuration, one-off files
    return "low";
  }

  private determineImprovementType(currentImport: string, suggestedImport: string): ImportImprovement["improvementType"] {
    if (currentImport.startsWith("./") || currentImport.startsWith("../")) {
      return "relative-to-alias";
    }

    if (suggestedImport.startsWith("$")) {
      return "import-map-utilization";
    }

    return "standardization";
  }

  private categorizeFile(filePath: string): ImportImprovement["category"] {
    if (filePath.includes("/server/services/") ||
        filePath.includes("/server/controller/") ||
        filePath.includes("/routes/api/")) {
      return "services";
    }

    if (filePath.includes("/routes/") && !filePath.includes("/api/")) {
      return "routes";
    }

    if (filePath.includes("/components/") ||
        filePath.includes("/islands/")) {
      return "components";
    }

    if (filePath.includes("/lib/") ||
        filePath.includes("/utils/") ||
        filePath.includes("/client/")) {
      return "utilities";
    }

    if (filePath.includes("/tests/") ||
        filePath.includes(".test.") ||
        filePath.includes(".spec.")) {
      return "tests";
    }

    if (filePath.includes("/types/") || filePath.endsWith(".d.ts")) {
      return "types";
    }

    return "utilities";
  }

  private calculatePriority(filePath: string, importPath: string): number {
    let priority = 50; // Base priority

    // High priority for frequently accessed files
    if (filePath.includes("/routes/api/")) priority += 30;
    if (filePath.includes("/server/services/")) priority += 25;
    if (filePath.includes("/islands/")) priority += 20;
    if (filePath.includes("/components/")) priority += 15;

    // Bonus for complex relative paths
    const relativeDepth = (importPath.match(/\.\.\//g) || []).length;
    priority += relativeDepth * 5;

    // Bonus for type imports (better tree-shaking)
    if (importPath.includes("/types/")) priority += 10;

    return priority;
  }

  private isFrequentlyUsedComponent(filePath: string): boolean {
    const fileName = basename(filePath, ".tsx");
    const frequentlyUsed = [
      "StampCard", "SRC20Overview", "FilterContent", "Gallery",
      "DataTable", "Header", "Navigation", "Modal"
    ];
    return frequentlyUsed.some(name => fileName.includes(name));
  }

  private generateReport(): AnalysisReport {
    // Sort by priority
    const priorityRanking = [...this.improvements].sort((a, b) => b.priority - a.priority);

    // Categorize improvements
    const categorizedImprovements: Record<string, ImportImprovement[]> = {};
    for (const improvement of this.improvements) {
      const category = improvement.category;
      if (!categorizedImprovements[category]) {
        categorizedImprovements[category] = [];
      }
      categorizedImprovements[category].push(improvement);
    }

    // Create batch strategy
    const batchStrategy = this.createBatchStrategy(priorityRanking);

    // Calculate impact summary
    const impactSummary: Record<string, number> = {};
    for (const improvement of this.improvements) {
      const key = `${improvement.category}-${improvement.impactLevel}`;
      impactSummary[key] = (impactSummary[key] || 0) + 1;
    }

    return {
      totalImprovements: this.improvements.length,
      categorizedImprovements,
      batchStrategy,
      impactSummary,
      priorityRanking
    };
  }

  private createBatchStrategy(priorityRanking: ImportImprovement[]): AnalysisReport["batchStrategy"] {
    const batch1: ImportImprovement[] = []; // High-impact services and API routes
    const batch2: ImportImprovement[] = []; // Core components and UI modules
    const batch3: ImportImprovement[] = []; // Utility and helper files
    const batch4: ImportImprovement[] = []; // Test files and configuration

    for (const improvement of priorityRanking) {
      if (improvement.category === "services" && improvement.impactLevel === "high") {
        batch1.push(improvement);
      } else if (improvement.category === "components" && improvement.impactLevel !== "low") {
        batch2.push(improvement);
      } else if (improvement.category === "utilities" || improvement.category === "types") {
        batch3.push(improvement);
      } else {
        batch4.push(improvement);
      }
    }

    return { batch1, batch2, batch3, batch4 };
  }
}

// Main execution
async function main() {
  const analyzer = new ImportAnalyzer();
  const report = await analyzer.analyzeCodebase();

  // Generate detailed report
  const reportPath = "./scripts/import-alias-analysis-report.json";
  await Deno.writeTextFile(reportPath, JSON.stringify(report, null, 2));

  // Generate summary
  console.log("\n📋 IMPORT ALIAS IMPROVEMENT ANALYSIS SUMMARY");
  console.log("=" .repeat(60));
  console.log(`Total improvements identified: ${report.totalImprovements}`);
  console.log("\n📊 Batch Strategy Distribution:");
  console.log(`  Batch 1 (High-impact services): ${report.batchStrategy.batch1.length} files`);
  console.log(`  Batch 2 (Core components): ${report.batchStrategy.batch2.length} files`);
  console.log(`  Batch 3 (Utilities): ${report.batchStrategy.batch3.length} files`);
  console.log(`  Batch 4 (Tests & config): ${report.batchStrategy.batch4.length} files`);

  console.log("\n🎯 Impact Level Distribution:");
  const highImpact = report.priorityRanking.filter(i => i.impactLevel === "high").length;
  const mediumImpact = report.priorityRanking.filter(i => i.impactLevel === "medium").length;
  const lowImpact = report.priorityRanking.filter(i => i.impactLevel === "low").length;
  console.log(`  High impact: ${highImpact}`);
  console.log(`  Medium impact: ${mediumImpact}`);
  console.log(`  Low impact: ${lowImpact}`);

  console.log("\n📁 Category Breakdown:");
  for (const [category, improvements] of Object.entries(report.categorizedImprovements)) {
    console.log(`  ${category}: ${improvements.length} improvements`);
  }

  console.log(`\n💾 Detailed report saved to: ${reportPath}`);
  console.log("\n✅ Analysis complete! Ready for batch processing.");

  return report;
}

if (import.meta.main) {
  await main();
}

export { ImportAnalyzer, type AnalysisReport, type ImportImprovement };
