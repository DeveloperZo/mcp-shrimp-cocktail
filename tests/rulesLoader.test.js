#!/usr/bin/env node
/**
 * Rules Loader Tests
 * Tests the AI Agent rules folder loading functionality including:
 * - Folder discovery
 * - File loading and combining
 * - Caching
 * - Size limits
 * - File filtering
 */

import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the rules loader (from dist after build)
let rulesLoader;
try {
  rulesLoader = await import('../dist/utils/rulesLoader.js');
} catch (error) {
  console.error('❌ Failed to import rulesLoader. Make sure to run "npm run build" first.');
  console.error(`   Error: ${error.message}`);
  process.exit(1);
}

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}`);
  if (details) console.log(`   ${details}`);
  
  results.tests.push({ name, passed, details });
  if (passed) results.passed++;
  else results.failed++;
}

// Test directory setup
const testDir = path.join(__dirname, 'test-rules-temp');
const testAiAgentDir = path.join(testDir, 'AI Agent');

async function setupTestDir() {
  // Clean up if exists
  if (fs.existsSync(testDir)) {
    await fsPromises.rm(testDir, { recursive: true, force: true });
  }
  
  // Create test directory structure
  await fsPromises.mkdir(testAiAgentDir, { recursive: true });
}

async function cleanupTestDir() {
  if (fs.existsSync(testDir)) {
    await fsPromises.rm(testDir, { recursive: true, force: true });
  }
}

console.log('🧪 Rules Loader Tests');
console.log('Testing AI Agent folder rules loading functionality');
console.log('==================================================\n');

// Setup
await setupTestDir();

// Test 1: Find AI Agent folder
console.log('1. Folder Discovery Tests');
console.log('--------------------------');

try {
  // Create test folder
  const found = await rulesLoader.findAiAgentFolder(testDir);
  logTest('Find AI Agent folder in test directory', 
    found === testAiAgentDir,
    found ? `Found: ${found}` : 'Folder not found');
} catch (error) {
  logTest('Find AI Agent folder (error handling)', false, error.message);
}

// Test 2: Load rules from folder
console.log('\n2. Rules Loading Tests');
console.log('---------------------');

try {
  // Create test markdown files
  await fsPromises.writeFile(
    path.join(testAiAgentDir, 'coding-standards.md'),
    '# Coding Standards\n\nUse TypeScript for all new code.'
  );
  
  await fsPromises.writeFile(
    path.join(testAiAgentDir, 'architecture.md'),
    '# Architecture\n\nFollow MVC pattern.'
  );
  
  await fsPromises.writeFile(
    path.join(testAiAgentDir, 'testing.md'),
    '# Testing\n\nWrite tests for all features.'
  );
  
  // Test loading all files
  const result = await rulesLoader.loadAiAgentRules(testDir);
  
  logTest('Load all rules from folder', result.success, 
    result.success 
      ? `Loaded ${result.filesLoaded.length} files: ${result.filesLoaded.join(', ')}`
      : result.error);
  
  logTest('Rules content contains expected files', 
    result.success && 
    result.rulesContent.includes('Coding Standards') &&
    result.rulesContent.includes('Architecture') &&
    result.rulesContent.includes('Testing'),
    result.success ? `Content length: ${result.rulesContent.length} chars` : 'Failed to load');
  
  logTest('Files are sorted alphabetically',
    result.success && 
    result.filesLoaded[0] === 'architecture.md' &&
    result.filesLoaded[1] === 'coding-standards.md' &&
    result.filesLoaded[2] === 'testing.md',
    result.success ? `Order: ${result.filesLoaded.join(' -> ')}` : 'Failed to load');
  
} catch (error) {
  logTest('Load rules (error handling)', false, error.message);
}

// Test 3: Caching
console.log('\n3. Caching Tests');
console.log('----------------');

try {
  // Clear cache first
  rulesLoader.clearRulesCache();
  
  // First load
  const result1 = await rulesLoader.loadAiAgentRules(testDir, { useCache: true });
  
  // Second load (should use cache)
  const startTime = Date.now();
  const result2 = await rulesLoader.loadAiAgentRules(testDir, { useCache: true });
  const loadTime = Date.now() - startTime;
  
  logTest('Cache returns same content', 
    result1.success && result2.success && result1.rulesContent === result2.rulesContent,
    `Content match: ${result1.rulesContent === result2.rulesContent}`);
  
  logTest('Cached load is fast', 
    loadTime < 10, // Should be instant from cache
    `Load time: ${loadTime}ms`);
  
  // Test cache stats
  const stats = rulesLoader.getCacheStats();
  logTest('Cache statistics available',
    stats.size > 0 && Array.isArray(stats.entries),
    `Cache size: ${stats.size}, Entries: ${stats.entries.length}`);
  
} catch (error) {
  logTest('Caching (error handling)', false, error.message);
}

// Test 4: File filtering
console.log('\n4. File Filtering Tests');
console.log('----------------------');

try {
  const result = await rulesLoader.loadAiAgentRules(testDir, {
    fileFilter: ['coding-standards.md', 'testing.md']
  });
  
  logTest('Load only filtered files',
    result.success && 
    result.filesLoaded.length === 2 &&
    result.filesLoaded.includes('coding-standards.md') &&
    result.filesLoaded.includes('testing.md') &&
    !result.filesLoaded.includes('architecture.md'),
    `Loaded: ${result.filesLoaded.join(', ')}`);
  
  logTest('Filtered content excludes other files',
    result.success &&
    result.rulesContent.includes('Coding Standards') &&
    result.rulesContent.includes('Testing') &&
    !result.rulesContent.includes('Architecture'),
    'Content check passed');
  
} catch (error) {
  logTest('File filtering (error handling)', false, error.message);
}

// Test 5: Size limits
console.log('\n5. Size Limit Tests');
console.log('-------------------');

try {
  // Create a large file
  const largeContent = '# Large File\n\n' + 'x'.repeat(100000);
  await fsPromises.writeFile(
    path.join(testAiAgentDir, 'large-file.md'),
    largeContent
  );
  
  // Test with size limit
  const result = await rulesLoader.loadAiAgentRules(testDir, {
    maxContentSize: 5000,
    maxFileSize: 2000
  });
  
  logTest('Size limit enforced',
    result.success && result.totalSize <= 5000,
    `Total size: ${result.totalSize} chars (limit: 5000)`);
  
  logTest('Truncation warning present',
    result.success && result.wasTruncated,
    `Was truncated: ${result.wasTruncated}`);
  
  logTest('Truncated content includes warning',
    result.success && 
    result.rulesContent.includes('truncated') || result.rulesContent.includes('limit'),
    'Warning message found');
  
} catch (error) {
  logTest('Size limits (error handling)', false, error.message);
}

// Test 6: Error handling
console.log('\n6. Error Handling Tests');
console.log('-----------------------');

try {
  // Test with non-existent folder
  const result1 = await rulesLoader.loadAiAgentRules('/nonexistent/path');
  logTest('Handle non-existent folder gracefully',
    !result1.success && result1.error && result1.rulesContent === '',
    `Error: ${result1.error}`);
  
  // Test with empty folder
  const emptyDir = path.join(testDir, 'empty-test');
  await fsPromises.mkdir(path.join(emptyDir, 'AI Agent'), { recursive: true });
  const result2 = await rulesLoader.loadAiAgentRules(emptyDir);
  logTest('Handle empty folder gracefully',
    !result2.success && result2.error && result2.error.includes('No markdown files'),
    `Error: ${result2.error}`);
  
  await fsPromises.rm(emptyDir, { recursive: true, force: true });
  
} catch (error) {
  logTest('Error handling (error handling)', false, error.message);
}

// Test 7: Alternative folder names
console.log('\n7. Alternative Folder Name Tests');
console.log('---------------------------------');

try {
  // Test with lowercase
  const lowerDir = path.join(testDir, 'lowercase-test');
  const lowerAiAgentDir = path.join(lowerDir, 'ai agent');
  await fsPromises.mkdir(lowerAiAgentDir, { recursive: true });
  await fsPromises.writeFile(
    path.join(lowerAiAgentDir, 'test.md'),
    '# Test\n\nLowercase folder test.'
  );
  
  const result1 = await rulesLoader.findAiAgentFolder(lowerDir);
  logTest('Find lowercase folder name',
    result1 === lowerAiAgentDir,
    result1 ? `Found: ${result1}` : 'Not found');
  
  // Test with underscore
  const underscoreDir = path.join(testDir, 'underscore-test');
  const underscoreAiAgentDir = path.join(underscoreDir, 'AI_Agent');
  await fsPromises.mkdir(underscoreAiAgentDir, { recursive: true });
  await fsPromises.writeFile(
    path.join(underscoreAiAgentDir, 'test.md'),
    '# Test\n\nUnderscore folder test.'
  );
  
  const result2 = await rulesLoader.findAiAgentFolder(underscoreDir);
  logTest('Find underscore folder name',
    result2 === underscoreAiAgentDir,
    result2 ? `Found: ${result2}` : 'Not found');
  
  // Cleanup
  await fsPromises.rm(lowerDir, { recursive: true, force: true });
  await fsPromises.rm(underscoreDir, { recursive: true, force: true });
  
} catch (error) {
  logTest('Alternative folder names (error handling)', false, error.message);
}

// Test 8: Integration with getAiAgentRulesContent
console.log('\n8. Integration Tests');
console.log('-------------------');

try {
  const content = await rulesLoader.getAiAgentRulesContent(testDir);
  
  logTest('getAiAgentRulesContent returns string',
    typeof content === 'string',
    `Type: ${typeof content}, Length: ${content.length}`);
  
  logTest('Content is not empty when folder exists',
    content.length > 0,
    `Content length: ${content.length}`);
  
  // Test with options (clear cache first to ensure fresh load)
  rulesLoader.clearRulesCache();
  const limitedContent = await rulesLoader.getAiAgentRulesContent(testDir, {
    maxContentSize: 1000
  });
  
  // Account for truncation warning message overhead (~100-200 chars)
  logTest('getAiAgentRulesContent respects options',
    limitedContent.length <= 1200, // Allow some overhead for truncation warnings
    `Limited content length: ${limitedContent.length} (limit: 1000, with warning overhead)`);
  
} catch (error) {
  logTest('Integration (error handling)', false, error.message);
}

// Cleanup
await cleanupTestDir();

// Summary
console.log('\n==================================================');
console.log('Test Summary');
console.log('==================================================');
console.log(`✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);
console.log(`📊 Total:  ${results.passed + results.failed}`);
console.log('');

if (results.failed === 0) {
  console.log('🎉 All tests passed!');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed. Please review the output above.');
  process.exit(1);
}

