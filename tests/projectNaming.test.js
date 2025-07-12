/**
 * Comprehensive Unit Tests for Project Naming Utilities
 * 
 * Run with: node tests/projectNaming.test.js
 */

import assert from 'assert';
import {
  sanitizeProjectName,
  validateProjectName,
  isProjectNameSanitized,
  generateUniqueProjectName,
  normalizeProjectNameForComparison
} from '../dist/utils/projectNaming.js';

// Test counter
let testCount = 0;
let passedTests = 0;

function test(description, testFunction) {
  testCount++;
  try {
    testFunction();
    passedTests++;
    console.log(`✅ Test ${testCount}: ${description}`);
  } catch (error) {
    console.log(`❌ Test ${testCount}: ${description}`);
    console.log(`   Error: ${error.message}`);
  }
}

console.log('🧪 Running Project Naming Utilities Tests\n');

// === sanitizeProjectName Tests ===
console.log('📝 Testing sanitizeProjectName function:');

test('Handles empty string', () => {
  assert.strictEqual(sanitizeProjectName(''), 'untitled-project');
});

test('Handles null/undefined input', () => {
  assert.strictEqual(sanitizeProjectName(null), 'untitled-project');
  assert.strictEqual(sanitizeProjectName(undefined), 'untitled-project');
});

test('Converts to lowercase', () => {
  assert.strictEqual(sanitizeProjectName('MyProject'), 'myproject');
  assert.strictEqual(sanitizeProjectName('UPPERCASE'), 'uppercase');
});

test('Replaces invalid characters with hyphens', () => {
  assert.strictEqual(sanitizeProjectName('project<>name'), 'project--name');
  assert.strictEqual(sanitizeProjectName('file:name'), 'file-name');
  assert.strictEqual(sanitizeProjectName('path\\to\\file'), 'path-to-file');
  assert.strictEqual(sanitizeProjectName('name|with|pipes'), 'name-with-pipes');
});

test('Replaces whitespace with hyphens', () => {
  assert.strictEqual(sanitizeProjectName('my project name'), 'my-project-name');
  assert.strictEqual(sanitizeProjectName('project\tname'), 'project-name');
  assert.strictEqual(sanitizeProjectName('project\n\rname'), 'project-name');
});

test('Collapses multiple hyphens', () => {
  assert.strictEqual(sanitizeProjectName('project---name'), 'project-name');
  assert.strictEqual(sanitizeProjectName('my--very--long--name'), 'my-very-long-name');
});

test('Removes leading and trailing hyphens', () => {
  assert.strictEqual(sanitizeProjectName('-project-'), 'project');
  assert.strictEqual(sanitizeProjectName('---project---'), 'project');
});

test('Handles dots at beginning and end', () => {
  assert.strictEqual(sanitizeProjectName('.project'), '-project');
  assert.strictEqual(sanitizeProjectName('project.'), 'project-');
  assert.strictEqual(sanitizeProjectName('.project.'), '-project-');
});

test('Limits length to 50 characters', () => {
  const longName = 'a'.repeat(100);
  const result = sanitizeProjectName(longName);
  assert(result.length <= 50);
  assert.strictEqual(result, 'a'.repeat(50));
});

test('Handles Windows reserved names', () => {
  assert.strictEqual(sanitizeProjectName('CON'), 'con-project');
  assert.strictEqual(sanitizeProjectName('prn'), 'prn-project');
  assert.strictEqual(sanitizeProjectName('AUX'), 'aux-project');
  assert.strictEqual(sanitizeProjectName('COM1'), 'com1-project');
});

test('Handles Unicode normalization', () => {
  const result = sanitizeProjectName('café');
  assert.strictEqual(result, 'café');
});

test('Handles complex mixed cases', () => {
  const result = sanitizeProjectName('  My<Project>Name!!!  ');
  assert.strictEqual(result, 'my-project-name');
});

// === validateProjectName Tests ===
console.log('\n📝 Testing validateProjectName function:');

test('Validates valid project names', () => {
  const result = validateProjectName('my-project');
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.errors.length, 0);
});

test('Rejects empty strings', () => {
  const result = validateProjectName('');
  assert.strictEqual(result.isValid, false);
  assert(result.errors.some(e => e.includes('required')));
});

test('Rejects null/undefined', () => {
  const result1 = validateProjectName(null);
  assert.strictEqual(result1.isValid, false);
  
  const result2 = validateProjectName(undefined);
  assert.strictEqual(result2.isValid, false);
});

test('Rejects names that are too long', () => {
  const longName = 'a'.repeat(51);
  const result = validateProjectName(longName);
  assert.strictEqual(result.isValid, false);
  assert(result.errors.some(e => e.includes('longer than')));
});

test('Rejects invalid characters', () => {
  const result = validateProjectName('project<name>');
  assert.strictEqual(result.isValid, false);
  assert(result.errors.some(e => e.includes('invalid characters')));
});

test('Rejects leading/trailing whitespace', () => {
  const result = validateProjectName(' project ');
  assert.strictEqual(result.isValid, false);
  assert(result.errors.some(e => e.includes('whitespace')));
});

test('Rejects leading/trailing dots', () => {
  const result1 = validateProjectName('.project');
  assert.strictEqual(result1.isValid, false);
  
  const result2 = validateProjectName('project.');
  assert.strictEqual(result2.isValid, false);
});

test('Rejects Windows reserved names', () => {
  const result = validateProjectName('CON');
  assert.strictEqual(result.isValid, false);
  assert(result.errors.some(e => e.includes('reserved')));
});

test('Rejects only special characters', () => {
  const result = validateProjectName('---');
  assert.strictEqual(result.isValid, false);
  assert(result.errors.some(e => e.includes('special characters')));
});

test('Rejects consecutive dots and hyphens', () => {
  const result1 = validateProjectName('project..name');
  assert.strictEqual(result1.isValid, false);
  
  const result2 = validateProjectName('project--name');
  assert.strictEqual(result2.isValid, false);
});

test('Provides sanitized name even for invalid input', () => {
  const result = validateProjectName('Invalid<>Name');
  assert.strictEqual(result.isValid, false);
  assert.strictEqual(result.sanitizedName, 'invalid--name');
});

// === isProjectNameSanitized Tests ===
console.log('\n📝 Testing isProjectNameSanitized function:');

test('Returns true for already sanitized names', () => {
  assert.strictEqual(isProjectNameSanitized('my-project'), true);
  assert.strictEqual(isProjectNameSanitized('simple'), true);
});

test('Returns false for unsanitized names', () => {
  assert.strictEqual(isProjectNameSanitized('My Project'), false);
  assert.strictEqual(isProjectNameSanitized('project<>name'), false);
  assert.strictEqual(isProjectNameSanitized(' project '), false);
});

// === generateUniqueProjectName Tests ===
console.log('\n📝 Testing generateUniqueProjectName function:');

test('Returns original name if not in existing set', () => {
  const existing = new Set(['other-project']);
  const result = generateUniqueProjectName('my-project', existing);
  assert.strictEqual(result, 'my-project');
});

test('Appends number if name exists', () => {
  const existing = new Set(['my-project']);
  const result = generateUniqueProjectName('my-project', existing);
  assert.strictEqual(result, 'my-project-1');
});

test('Increments until unique name found', () => {
  const existing = new Set(['my-project', 'my-project-1', 'my-project-2']);
  const result = generateUniqueProjectName('my-project', existing);
  assert.strictEqual(result, 'my-project-3');
});

test('Handles long names with truncation', () => {
  const longName = 'a'.repeat(50);
  const existing = new Set([longName]);
  const result = generateUniqueProjectName(longName, existing);
  assert(result.length <= 50);
  assert(result.endsWith('-1'));
});

test('Sanitizes input name before processing', () => {
  const existing = new Set();
  const result = generateUniqueProjectName('My<>Project', existing);
  assert.strictEqual(result, 'my--project');
});

// === normalizeProjectNameForComparison Tests ===
console.log('\n📝 Testing normalizeProjectNameForComparison function:');

test('Converts to lowercase', () => {
  assert.strictEqual(normalizeProjectNameForComparison('MyProject'), 'myproject');
});

test('Trims whitespace', () => {
  assert.strictEqual(normalizeProjectNameForComparison(' project '), 'project');
});

test('Normalizes Unicode', () => {
  const result = normalizeProjectNameForComparison('café');
  assert.strictEqual(result, 'café');
});

// === Edge Cases and Integration Tests ===
console.log('\n📝 Testing edge cases and integration:');

test('Handles extremely long names with invalid characters', () => {
  const complexName = 'A'.repeat(30) + '<>|?*' + 'B'.repeat(30);
  const sanitized = sanitizeProjectName(complexName);
  assert(sanitized.length <= 50);
  assert(!sanitized.includes('<'));
  assert(!sanitized.includes('>'));
});

test('Handles Unicode edge cases', () => {
  const result = sanitizeProjectName('émojis-🚀-and-ñoñó');
  assert(typeof result === 'string');
  assert(result.length > 0);
});

test('Validates and sanitizes work together', () => {
  const invalidName = '  Invalid<>Name!!!  ';
  const validation = validateProjectName(invalidName);
  const sanitized = sanitizeProjectName(invalidName);
  
  assert.strictEqual(validation.isValid, false);
  assert.strictEqual(validation.sanitizedName, sanitized);
  assert.strictEqual(sanitized, 'invalid--name');
});

test('Handles empty and whitespace-only names', () => {
  assert.strictEqual(sanitizeProjectName('   '), 'untitled-project');
  assert.strictEqual(sanitizeProjectName('\t\n\r'), 'untitled-project');
});

// === Results Summary ===
console.log('\n📊 Test Results Summary:');
console.log(`Total tests: ${testCount}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${testCount - passedTests}`);

if (passedTests === testCount) {
  console.log('🎉 All tests passed!');
  process.exit(0);
} else {
  console.log('💥 Some tests failed!');
  process.exit(1);
}
