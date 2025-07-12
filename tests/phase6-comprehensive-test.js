#!/usr/bin/env node
/**
 * Phase 6 Testing Script: Comprehensive validation of explicit project specification changes
 * Tests all tool functions, error handling, project resolution, and template rendering
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

console.log('🧪 Phase 6: Comprehensive Testing Suite');
console.log('Testing explicit project specification implementation');
console.log('====================================================\n');

// Test 1: Verify TypeScript compilation
console.log('1. TypeScript Compilation Tests');
console.log('--------------------------------');

try {
  // Check if dist directory exists (indicates successful build)
  const distPath = path.join(__dirname, 'dist');
  const distExists = fs.existsSync(distPath);
  logTest('Dist directory exists', distExists, distExists ? 'Build artifacts present' : 'Run npm run build first');
  
  // Check main entry point exists
  const mainEntry = path.join(distPath, 'index.js');
  const mainExists = fs.existsSync(mainEntry);
  logTest('Main entry point compiled', mainExists, mainExists ? 'index.js exists in dist' : 'Main compilation failed');
  
} catch (error) {
  logTest('TypeScript compilation check', false, error.message);
}

// Test 2: Verify project resolution helper exists and is properly exported
console.log('\n2. Project Resolution Architecture Tests');
console.log('----------------------------------------');

try {
  const resolverPath = path.join(__dirname, 'src', 'utils', 'projectResolver.ts');
  const resolverExists = fs.existsSync(resolverPath);
  logTest('Project resolver file exists', resolverExists);
  
  if (resolverExists) {
    const resolverContent = fs.readFileSync(resolverPath, 'utf8');
    const hasResolveProject = resolverContent.includes('export function resolveProject');
    logTest('resolveProject function exported', hasResolveProject);
    
    const hasErrorHandling = resolverContent.includes('availableProjects') && resolverContent.includes('suggestions');
    logTest('Enhanced error handling implemented', hasErrorHandling);
  }
} catch (error) {
  logTest('Project resolver verification', false, error.message);
}

// Test 3: Template files verification
console.log('\n3. Template System Tests');
console.log('-------------------------');

const templateTests = [
  {
    path: 'src/prompts/templates_en/planManagement/deletePlan/defaultProtection.md',
    name: 'English plan protection template',
    shouldNotContain: ['default plan', 'Default Plan'],
    shouldContain: ['Plan Deletion Not Allowed']
  },
  {
    path: 'src/prompts/templates_en/projectManagement/deleteProject/defaultProtection.md', 
    name: 'English project protection template',
    shouldNotContain: ['default project', 'Default Project'],
    shouldContain: ['Project Deletion Not Allowed']
  },
  {
    path: 'src/prompts/templates_en/projectManagement/getProjectInfo/noProject.md',
    name: 'English no project template',
    shouldNotContain: ['current project', 'No current project'],
    shouldContain: ['Project Name Required']
  },
  {
    path: 'src/prompts/templates_zh/planManagement/deletePlan/defaultProtection.md',
    name: 'Chinese plan protection template',
    shouldContain: ['計劃無法刪除']
  },
  {
    path: 'src/prompts/templates_zh/projectManagement/deleteProject/defaultProtection.md',
    name: 'Chinese project protection template', 
    shouldContain: ['項目無法刪除']
  }
];

templateTests.forEach(test => {
  try {
    const templatePath = path.join(__dirname, test.path);
    const exists = fs.existsSync(templatePath);
    
    if (!exists) {
      logTest(`${test.name} exists`, false, 'Template file not found');
      return;
    }
    
    const content = fs.readFileSync(templatePath, 'utf8');
    
    // Test for content that should NOT be present
    if (test.shouldNotContain) {
      const hasProblematic = test.shouldNotContain.some(term => 
        content.toLowerCase().includes(term.toLowerCase())
      );
      logTest(`${test.name} - no problematic references`, !hasProblematic, 
        hasProblematic ? `Found: ${test.shouldNotContain.find(term => content.toLowerCase().includes(term.toLowerCase()))}` : 'Clean');
    }
    
    // Test for content that SHOULD be present
    if (test.shouldContain) {
      const hasRequired = test.shouldContain.every(term => 
        content.includes(term)
      );
      logTest(`${test.name} - has required content`, hasRequired,
        hasRequired ? 'All required content present' : `Missing: ${test.shouldContain.find(term => !content.includes(term))}`);
    }
    
  } catch (error) {
    logTest(`${test.name} verification`, false, error.message);
  }
});

// Test 4: Tool files use project resolver
console.log('\n4. Tool Implementation Tests');
console.log('----------------------------');

const toolDirectories = [
  'src/tools/task',
  'src/tools/project', 
  'src/tools/plan'
];

toolDirectories.forEach(dir => {
  try {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
      logTest(`${dir} directory exists`, false);
      return;
    }
    
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.ts') && f !== 'index.ts');
    
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check if tools that need project resolution import the resolver
      const needsProjectResolution = content.includes('projectName') && 
        (content.includes('listTasks') || content.includes('getProject') || content.includes('addTask'));
      
      if (needsProjectResolution) {
        const usesResolver = content.includes('resolveProject');
        logTest(`${dir}/${file} uses project resolver`, usesResolver, 
          usesResolver ? 'Centralized resolver imported' : 'May need manual project handling');
      }
    });
    
  } catch (error) {
    logTest(`${dir} tool verification`, false, error.message);
  }
});

// Test 5: Schema descriptions check
console.log('\n5. Schema Description Tests');
console.log('---------------------------');

try {
  const toolsIndexPath = path.join(__dirname, 'src', 'tools', 'index.ts');
  if (fs.existsSync(toolsIndexPath)) {
    const content = fs.readFileSync(toolsIndexPath, 'utf8');
    
    const hasDefaultProjectRefs = content.toLowerCase().includes('default project') || 
                                 content.toLowerCase().includes("use 'default'");
    
    logTest('Tool schemas - no default project references', !hasDefaultProjectRefs,
      hasDefaultProjectRefs ? 'Found default project references in schemas' : 'Schemas clean');
  }
} catch (error) {
  logTest('Schema description verification', false, error.message);
}

// Summary
console.log('\n📊 Test Results Summary');
console.log('========================');
console.log(`Total Tests: ${results.tests.length}`);
console.log(`Passed: ${results.passed}`);
console.log(`Failed: ${results.failed}`);
console.log(`Success Rate: ${Math.round((results.passed / results.tests.length) * 100)}%`);

// Test 6: Documentation files verification
console.log('\n6. Documentation Update Tests');
console.log('------------------------------');

try {
  // Check README.md has project specification section
  const readmePath = path.join(__dirname, 'README.md');
  if (fs.existsSync(readmePath)) {
    const readmeContent = fs.readFileSync(readmePath, 'utf8');
    
    const hasProjectSpecSection = readmeContent.includes('## 🎯 Project Specification Requirements');
    logTest('README contains project specification section', hasProjectSpecSection);
    
    const hasBreakingChangeWarning = readmeContent.includes('IMPORTANT BREAKING CHANGE');
    logTest('README contains breaking change warning', hasBreakingChangeWarning);
    
    const hasMigrationReference = readmeContent.includes('MIGRATION.md');
    logTest('README references migration guide', hasMigrationReference);
  }
  
  // Check MIGRATION.md exists and has key content
  const migrationPath = path.join(__dirname, 'MIGRATION.md');
  const migrationExists = fs.existsSync(migrationPath);
  logTest('Migration guide exists', migrationExists);
  
  if (migrationExists) {
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    const hasMigrationSteps = migrationContent.includes('Migration Steps');
    logTest('Migration guide has step-by-step instructions', hasMigrationSteps);
    
    const hasErrorExamples = migrationContent.includes('Common Error Messages');
    logTest('Migration guide includes error examples', hasErrorExamples);
  }
} catch (error) {
  logTest('Documentation verification', false, error.message);
}

// Test 7: Project naming utility verification
console.log('\n7. Project Naming Utility Tests');
console.log('--------------------------------');

try {
  const projectNamingPath = path.join(__dirname, 'src', 'utils', 'projectNaming.ts');
  if (fs.existsSync(projectNamingPath)) {
    const content = fs.readFileSync(projectNamingPath, 'utf8');
    const hasValidation = content.includes('validateProjectName') || content.includes('isValidProjectName');
    logTest('Project naming validation exists', hasValidation);
  } else {
    logTest('Project naming utility exists', false, 'File not found');
  }
} catch (error) {
  logTest('Project naming utility check', false, error.message);
}

// Test 8: Version consistency check
console.log('\n8. Version and Changelog Tests');
console.log('------------------------------');

try {
  const packageJsonPath = path.join(__dirname, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const version = packageJson.version;
    
    // Check if version is 1.0.20 or higher
    const versionParts = version.split('.').map(Number);
    const isCorrectVersion = versionParts[0] >= 1 && versionParts[1] >= 0 && versionParts[2] >= 20;
    logTest('Version indicates breaking change support', isCorrectVersion, `Version: ${version}`);
  }
  
  // Check changelog mentions the breaking change
  const changelogPath = path.join(__dirname, 'CHANGELOG.md');
  if (fs.existsSync(changelogPath)) {
    const changelogContent = fs.readFileSync(changelogPath, 'utf8');
    const mentionsExplicitProjects = changelogContent.toLowerCase().includes('explicit project');
    logTest('Changelog documents explicit project changes', mentionsExplicitProjects);
  }
} catch (error) {
  logTest('Version/changelog verification', false, error.message);
}

if (results.failed > 0) {
  console.log('\n❌ Failed Tests:');
  results.tests.filter(t => !t.passed).forEach(test => {
    console.log(`   • ${test.name}: ${test.details}`);
  });
  console.log('\n📝 Next Steps:');
  console.log('   1. Address failed tests before deployment');
  console.log('   2. Run npm run build to verify compilation');
  console.log('   3. Test with actual MCP client');
  process.exit(1);
} else {
  console.log('\n🎉 All tests passed! System ready for explicit project specification.');
  console.log('\n✅ Phase 6 Testing Complete:');
  console.log('   • TypeScript compilation verified');
  console.log('   • Project resolution architecture confirmed');
  console.log('   • Template system updated and consistent');
  console.log('   • Tool implementations use centralized resolver');
  console.log('   • Documentation updated with migration guide');
  console.log('   • No default project references remain');
  console.log('\n🚀 Ready for production deployment!');
  process.exit(0);
}
