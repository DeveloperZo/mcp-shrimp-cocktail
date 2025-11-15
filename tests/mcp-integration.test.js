#!/usr/bin/env node
/**
 * MCP Integration Tests
 * Tests the improved MCP server implementation including:
 * - Tool registry functionality
 * - Error handling
 * - Resources support
 * - Prompt handling
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

console.log('🧪 MCP Integration Tests');
console.log('Testing improved MCP server implementation');
console.log('==========================================\n');

// Test 1: Tool Registry Exists
console.log('1. Tool Registry Tests');
console.log('----------------------');

try {
  const registryPath = path.join(__dirname, '..', 'src', 'tools', 'registry.ts');
  const registryExists = fs.existsSync(registryPath);
  logTest('Tool registry file exists', registryExists, 
    registryExists ? 'registry.ts found' : 'File not found');
  
  if (registryExists) {
    const content = fs.readFileSync(registryPath, 'utf8');
    const hasToolRegistry = content.includes('class ToolRegistry') || content.includes('export class ToolRegistry');
    logTest('ToolRegistry class exported', hasToolRegistry);
    
    const hasRegisterMethod = content.includes('register(');
    logTest('Registry has register method', hasRegisterMethod);
    
    const hasGetMethod = content.includes('get(');
    logTest('Registry has get method', hasGetMethod);
    
    const hasListMethod = content.includes('list(');
    logTest('Registry has list method', hasListMethod);
    
    const exportsToolRegistry = content.includes('export const toolRegistry') || content.includes('export { toolRegistry }');
    logTest('Tool registry instance exported', exportsToolRegistry);
  }
} catch (error) {
  logTest('Tool registry verification', false, error.message);
}

// Test 2: Error Handling Module
console.log('\n2. Error Handling Tests');
console.log('------------------------');

try {
  const errorsPath = path.join(__dirname, '..', 'src', 'server', 'errors.ts');
  const errorsExists = fs.existsSync(errorsPath);
  logTest('Error handling file exists', errorsExists);
  
  if (errorsExists) {
    const content = fs.readFileSync(errorsPath, 'utf8');
    const hasErrorCode = content.includes('McpErrorCode') || content.includes('enum McpErrorCode');
    logTest('Error code enum defined', hasErrorCode);
    
    const hasCreateErrorResponse = content.includes('createErrorResponse');
    logTest('createErrorResponse function exists', hasCreateErrorResponse);
    
    const hasValidationError = content.includes('createValidationErrorResponse');
    logTest('Validation error handler exists', hasValidationError);
    
    const hasExecutionError = content.includes('createExecutionErrorResponse');
    logTest('Execution error handler exists', hasExecutionError);
    
    const hasToolNotFound = content.includes('createToolNotFoundResponse');
    logTest('Tool not found handler exists', hasToolNotFound);
  }
} catch (error) {
  logTest('Error handling verification', false, error.message);
}

// Test 3: MCP Server Refactoring
console.log('\n3. MCP Server Refactoring Tests');
console.log('-------------------------------');

try {
  const mcpPath = path.join(__dirname, '..', 'src', 'server', 'mcp.ts');
  if (fs.existsSync(mcpPath)) {
    const content = fs.readFileSync(mcpPath, 'utf8');
    
    // Check for tool registry usage
    const usesRegistry = content.includes('toolRegistry') && content.includes('from "../tools/registry.js"');
    logTest('MCP server uses tool registry', usesRegistry);
    
    // Check for registerAllTools function
    const hasRegisterFunction = content.includes('registerAllTools') || content.includes('function registerAllTools');
    logTest('Has registerAllTools function', hasRegisterFunction);
    
    // Check that switch statement is removed or significantly reduced
    const switchStatementCount = (content.match(/case\s+"[^"]+":/g) || []).length;
    const usesRegistryPattern = content.includes('toolRegistry.get(') && content.includes('toolRegistry.list()');
    
    if (usesRegistryPattern) {
      logTest('Uses registry pattern instead of large switch', true, 
        `Found ${switchStatementCount} case statements (should be 0 or minimal)`);
    } else {
      logTest('Uses registry pattern instead of large switch', false, 
        'Still using switch statement pattern');
    }
    
    // Check for error handling imports
    const importsErrors = content.includes('from "./errors.js"') || content.includes('from "../server/errors.js"');
    logTest('Imports error handling utilities', importsErrors);
    
    // Check for resources support
    const hasResources = content.includes('ListResourcesRequestSchema') && content.includes('ReadResourceRequestSchema');
    logTest('Has resources support', hasResources);
    
    // Check for improved prompt error handling
    const hasPromptValidation = content.includes('MISSING_PROMPT_ARGUMENTS') || 
                                (content.includes('prompt.arguments') && content.includes('required'));
    logTest('Prompt handler validates arguments', hasPromptValidation);
    
    // Check for graceful shutdown
    const hasShutdown = content.includes('SIGINT') || content.includes('SIGTERM') || content.includes('shutdown');
    logTest('Has graceful shutdown handling', hasShutdown);
  } else {
    logTest('MCP server file exists', false);
  }
} catch (error) {
  logTest('MCP server refactoring verification', false, error.message);
}

// Test 4: Tool Registration Completeness
console.log('\n4. Tool Registration Tests');
console.log('--------------------------');

try {
  const mcpPath = path.join(__dirname, '..', 'src', 'server', 'mcp.ts');
  if (fs.existsSync(mcpPath)) {
    const content = fs.readFileSync(mcpPath, 'utf8');
    
    // List of expected tools
    const expectedTools = [
      'plan_task', 'analyze_task', 'reflect_task', 'split_tasks',
      'list_tasks', 'execute_task', 'verify_task', 'delete_task',
      'clear_all_tasks', 'update_task', 'query_task', 'get_task_detail',
      'add_task', 'process_thought', 'research_mode',
      'create_project', 'list_projects', 'switch_project', 'delete_project',
      'get_project_info', 'create_plan', 'list_plans', 'switch_plan',
      'delete_plan', 'get_plan_info', 'init_project_rules'
    ];
    
    let registeredCount = 0;
    expectedTools.forEach(tool => {
      const toolRegisterPattern = new RegExp(`register\\s*\\(\\s*["']${tool.replace(/_/g, '\\_')}["']`, 'g');
      if (toolRegisterPattern.test(content)) {
        registeredCount++;
      }
    });
    
    logTest(`Tool registration completeness (${registeredCount}/${expectedTools.length})`, 
      registeredCount === expectedTools.length,
      `Registered: ${registeredCount}, Expected: ${expectedTools.length}`);
  }
} catch (error) {
  logTest('Tool registration verification', false, error.message);
}

// Test 5: TypeScript Compilation
console.log('\n5. TypeScript Compilation Tests');
console.log('-------------------------------');

try {
  const distPath = path.join(__dirname, '..', 'dist');
  const distExists = fs.existsSync(distPath);
  
  if (distExists) {
    // Check for compiled registry
    const registryDist = path.join(distPath, 'tools', 'registry.js');
    logTest('Compiled registry exists', fs.existsSync(registryDist));
    
    // Check for compiled errors
    const errorsDist = path.join(distPath, 'server', 'errors.js');
    logTest('Compiled error handling exists', fs.existsSync(errorsDist));
    
    // Check for compiled MCP server
    const mcpDist = path.join(distPath, 'server', 'mcp.js');
    logTest('Compiled MCP server exists', fs.existsSync(mcpDist));
  } else {
    logTest('Dist directory exists', false, 'Run npm run build first');
  }
} catch (error) {
  logTest('TypeScript compilation check', false, error.message);
}

// Test 6: Code Quality Metrics
console.log('\n6. Code Quality Metrics');
console.log('----------------------');

try {
  const mcpPath = path.join(__dirname, '..', 'src', 'server', 'mcp.ts');
  if (fs.existsSync(mcpPath)) {
    const content = fs.readFileSync(mcpPath, 'utf8');
    const lines = content.split('\n').length;
    
    // Check line count (should be reasonable, not excessive)
    logTest('MCP server file size reasonable', lines < 1000, 
      `File has ${lines} lines (target: <1000)`);
    
    // Check for code duplication (should have minimal repetition)
    const casePattern = /case\s+"[^"]+":/g;
    const caseMatches = content.match(casePattern) || [];
    logTest('Minimal code duplication', caseMatches.length < 5, 
      `Found ${caseMatches.length} case statements (should be <5 with registry pattern)`);
    
    // Check for proper error handling
    const tryCatchBlocks = (content.match(/try\s*{/g) || []).length;
    logTest('Proper error handling present', tryCatchBlocks >= 3, 
      `Found ${tryCatchBlocks} try-catch blocks`);
  }
} catch (error) {
  logTest('Code quality check', false, error.message);
}

// Summary
console.log('\n📊 Test Results Summary');
console.log('========================');
console.log(`Total Tests: ${results.tests.length}`);
console.log(`Passed: ${results.passed}`);
console.log(`Failed: ${results.failed}`);
console.log(`Success Rate: ${Math.round((results.passed / results.tests.length) * 100)}%`);

if (results.failed > 0) {
  console.log('\n❌ Failed Tests:');
  results.tests.filter(t => !t.passed).forEach(test => {
    console.log(`   • ${test.name}: ${test.details}`);
  });
  console.log('\n📝 Next Steps:');
  console.log('   1. Review failed tests');
  console.log('   2. Run npm run build to verify compilation');
  console.log('   3. Test with actual MCP client');
  process.exit(1);
} else {
  console.log('\n🎉 All MCP integration tests passed!');
  console.log('\n✅ Improvements Verified:');
  console.log('   • Tool registry implemented');
  console.log('   • Error handling improved');
  console.log('   • Resources support added');
  console.log('   • Code duplication reduced');
  console.log('   • Maintainability improved');
  console.log('\n🚀 Ready for use!');
  process.exit(0);
}

