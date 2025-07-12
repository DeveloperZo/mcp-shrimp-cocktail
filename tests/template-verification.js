// Quick test to verify template rendering after updates
import { loadPromptFromTemplate } from "../src/prompts/loader.js";

// Test updated templates
console.log("Testing updated templates...\n");

// Test 1: English plan deletion protection
try {
  const planProtection = loadPromptFromTemplate("planManagement/deletePlan/defaultProtection.md", {
    planName: "Main Development Plan",
    projectName: "my-project"
  });
  console.log("✅ Plan protection template loads correctly");
  console.log("   Contains 'plan cannot be deleted':", planProtection.includes("plan cannot be deleted"));
  console.log("   No 'default plan' references:", !planProtection.includes("default plan"));
} catch (error) {
  console.log("❌ Plan protection template failed:", error.message);
}

// Test 2: English project deletion protection  
try {
  const projectProtection = loadPromptFromTemplate("projectManagement/deleteProject/defaultProtection.md", {
    projectName: "test-project"
  });
  console.log("✅ Project protection template loads correctly");
  console.log("   No 'default project' references:", !projectProtection.includes("default project"));
} catch (error) {
  console.log("❌ Project protection template failed:", error.message);
}

// Test 3: English no project template
try {
  const noProject = loadPromptFromTemplate("projectManagement/getProjectInfo/noProject.md", {});
  console.log("✅ No project template loads correctly");
  console.log("   Updated to require explicit project names:", noProject.includes("Project Name Required"));
} catch (error) {
  console.log("❌ No project template failed:", error.message);
}

// Test 4: Chinese templates
try {
  process.env.TEMPLATES_USE = "zh";
  
  const chineseProjectProtection = loadPromptFromTemplate("projectManagement/deleteProject/defaultProtection.md", {
    projectName: "測試項目"
  });
  console.log("✅ Chinese project protection template loads correctly");
  
  const chinesePlanProtection = loadPromptFromTemplate("planManagement/deletePlan/defaultProtection.md", {
    planName: "測試計劃",
    projectName: "測試項目"
  });
  console.log("✅ Chinese plan protection template loads correctly");
  
  const chineseNoProject = loadPromptFromTemplate("projectManagement/getProjectInfo/noProject.md", {});
  console.log("✅ Chinese no project template loads correctly");
  
} catch (error) {
  console.log("❌ Chinese template failed:", error.message);
}

console.log("\n✅ Template testing completed!");
