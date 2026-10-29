#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Import Map Extraction Script for Task 29.1
 * 
 * Extracts complete import map from main deno.json (lines 240-382)
 * and generates structured JSON for systematic path conversion to test config.
 * 
 * CRITICAL: This resolves the import map misalignment blocking Tasks 30-33
 */

interface ImportMapEntry {
  alias: string;
  originalPath: string;
  pathType: 'core' | 'utility' | 'component' | 'duplicate';
  category: string;
}

interface ImportMapAnalysis {
  totalAliases: number;
  corePaths: ImportMapEntry[];
  utilityPaths: ImportMapEntry[];
  componentPaths: ImportMapEntry[];
  duplicatePaths: ImportMapEntry[];
  conversionMapping: Record<string, string>;
}

async function extractImportMap(): Promise<ImportMapAnalysis> {
  console.log('🔍 Extracting import map from deno.json...');
  
  const denoJsonPath = './deno.json';
  const denoJsonContent = await Deno.readTextFile(denoJsonPath);
  const denoConfig = JSON.parse(denoJsonContent);
  
  const importMap = denoConfig.imports || {};
  const analysis: ImportMapAnalysis = {
    totalAliases: 0,
    corePaths: [],
    utilityPaths: [],
    componentPaths: [],
    duplicatePaths: [],
    conversionMapping: {}
  };
  
  // Extract and categorize all import aliases
  for (const [alias, path] of Object.entries(importMap)) {
    if (typeof path !== 'string') continue;
    
    const entry: ImportMapEntry = {
      alias,
      originalPath: path,
      pathType: categorizeAlias(alias, path),
      category: getCategoryFromPath(path)
    };
    
    // Add to appropriate category
    switch (entry.pathType) {
      case 'core':
        analysis.corePaths.push(entry);
        break;
      case 'utility':
        analysis.utilityPaths.push(entry);
        break;
      case 'component':
        analysis.componentPaths.push(entry);
        break;
      case 'duplicate':
        analysis.duplicatePaths.push(entry);
        break;
    }
    
    // Generate conversion mapping for test config
    const testPath = convertToTestPath(path);
    analysis.conversionMapping[alias] = testPath;
    
    analysis.totalAliases++;
  }
  
  console.log(`✅ Extracted ${analysis.totalAliases} import aliases`);
  console.log(`   - Core paths: ${analysis.corePaths.length}`);
  console.log(`   - Utility paths: ${analysis.utilityPaths.length}`);
  console.log(`   - Component paths: ${analysis.componentPaths.length}`);
  console.log(`   - Duplicate paths: ${analysis.duplicatePaths.length}`);
  
  return analysis;
}

function categorizeAlias(alias: string, path: string): ImportMapEntry['pathType'] {
  // Core system aliases
  if (alias.match(/^(\$\/|\$client\/|\$components\/|\$constants|\$globals|\$handlers\/|\$islands\/|\$lib\/|\$routes\/|\$server\/|\$types\/|\$utils\/)$/)) {
    return 'core';
  }
  
  // Component shortcuts
  if (alias.match(/^(\$freshNav|\$layout|\$header|\$content|\$section|\$card|\$text|\$button|\$icon|\$form|\$notification|\$table|\$fee|\$fees|\$animation|\$progressiveFees)$/)) {
    return 'component';
  }
  
  // Check for duplicate patterns ($/lib/... vs $lib/...)
  if (alias.startsWith('$/lib/') && path.startsWith('./lib/')) {
    return 'duplicate';
  }
  
  // Everything else is utility
  return 'utility';
}

function getCategoryFromPath(path: string): string {
  if (path.includes('/api/')) return 'api';
  if (path.includes('/bitcoin/')) return 'bitcoin';
  if (path.includes('/ui/')) return 'ui';
  if (path.includes('/monitoring/')) return 'monitoring';
  if (path.includes('/security/')) return 'security';
  if (path.includes('/performance/')) return 'performance';
  if (path.includes('/data/')) return 'data';
  if (path.includes('/minting/')) return 'minting';
  if (path.includes('/sorting/')) return 'sorting';
  if (path.includes('/types/')) return 'types';
  if (path.includes('/components/')) return 'components';
  if (path.includes('/islands/')) return 'islands';
  if (path.includes('/server/')) return 'server';
  return 'general';
}

function convertToTestPath(originalPath: string): string {
  // Convert ./ relative paths to ../ for test directory context
  if (originalPath.startsWith('./')) {
    return originalPath.replace('./', '../');
  }
  return originalPath;
}

async function generateOutputFiles(analysis: ImportMapAnalysis): Promise<void> {
  console.log('📄 Generating output files...');
  
  // Create comprehensive extraction report
  const reportPath = './scripts/import-map-extraction-report.json';
  await Deno.writeTextFile(reportPath, JSON.stringify(analysis, null, 2));
  console.log(`✅ Created extraction report: ${reportPath}`);
  
  // Create test config conversion mapping
  const testConfigPath = './scripts/test-config-import-map.json';
  const testConfig = {
    imports: analysis.conversionMapping
  };
  await Deno.writeTextFile(testConfigPath, JSON.stringify(testConfig, null, 2));
  console.log(`✅ Created test config mapping: ${testConfigPath}`);
  
  // Create detailed analysis summary
  const summaryPath = './scripts/import-map-analysis-summary.md';
  const summary = generateAnalysisSummary(analysis);
  await Deno.writeTextFile(summaryPath, summary);
  console.log(`✅ Created analysis summary: ${summaryPath}`);
}

function generateAnalysisSummary(analysis: ImportMapAnalysis): string {
  return `# Import Map Extraction Analysis - Task 29.1

## Summary
- **Total Aliases Extracted**: ${analysis.totalAliases}
- **Extraction Date**: ${new Date().toISOString()}
- **Source**: deno.json lines 240-382

## Breakdown by Type
- **Core Paths**: ${analysis.corePaths.length} (essential system aliases)
- **Utility Paths**: ${analysis.utilityPaths.length} (specific utility functions)
- **Component Paths**: ${analysis.componentPaths.length} (UI component shortcuts)
- **Duplicate Paths**: ${analysis.duplicatePaths.length} (redundant aliases to clean up)

## Category Distribution
${Object.entries(groupByCategory(analysis)).map(([category, count]) => 
  `- **${category}**: ${count} aliases`
).join('\n')}

## Conversion Strategy
All aliases have been converted from \`./\` relative paths to \`../\` paths for test directory context.

## Next Steps (Task 29.2)
1. Implement systematic path conversion logic
2. Apply conversion mapping to test configuration
3. Validate import resolution from test directory context

## Critical Findings
- Main config has ${analysis.totalAliases} aliases vs test config's 26 aliases
- Missing ${analysis.totalAliases - 26} aliases causing import resolution failures
- Duplicate pattern detected: ${analysis.duplicatePaths.length} redundant aliases need cleanup

## Ready for Task 29.2 Implementation
The conversion mapping is ready for systematic application to tests/deno.json.
`;
}

function groupByCategory(analysis: ImportMapAnalysis): Record<string, number> {
  const categories: Record<string, number> = {};
  
  [...analysis.corePaths, ...analysis.utilityPaths, ...analysis.componentPaths, ...analysis.duplicatePaths]
    .forEach(entry => {
      categories[entry.category] = (categories[entry.category] || 0) + 1;
    });
  
  return categories;
}

// Main execution
if (import.meta.main) {
  try {
    console.log('🚀 Starting Import Map Extraction for Task 29.1');
    console.log('📍 Target: deno.json lines 240-382 (142+ aliases)');
    console.log('🎯 Goal: Unblock Tasks 30-33 through import map alignment\n');
    
    const analysis = await extractImportMap();
    await generateOutputFiles(analysis);
    
    console.log('\n✅ TASK 29.1 EXTRACTION COMPLETE');
    console.log('📋 Files Generated:');
    console.log('   - scripts/import-map-extraction-report.json (full analysis)');
    console.log('   - scripts/test-config-import-map.json (conversion mapping)');
    console.log('   - scripts/import-map-analysis-summary.md (human-readable summary)');
    console.log('\n➡️  Ready for Task 29.2: Path Conversion Logic Implementation');
    console.log('🔓 Will unblock: Tasks 30-33 (URL replacement, mixed patterns, alias optimization)');
    
  } catch (error) {
    console.error('❌ Import map extraction failed:', error);
    Deno.exit(1);
  }
}