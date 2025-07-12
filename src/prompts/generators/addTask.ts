import {
  loadPrompt,
  generatePrompt,
  loadPromptFromTemplate,
} from "../loader.js";

/**
 * Project context interface
 */
export interface ProjectContext {
  currentProject?: string;
  projectStatus?: string;
  projectTaskCount?: number;
}

/**
 * addTask prompt parameters interface
 */
export interface AddTaskPromptParams {
  taskName?: string;
  taskId?: string;
  description?: string;
  notes?: string;
  dependenciesCount?: number;
  relatedFilesCount?: number;
  hasImplementationGuide?: boolean;
  hasVerificationCriteria?: boolean;
  error?: string;
  projectContext?: ProjectContext;
}

/**
 * Get the complete addTask prompt
 * @param scenario success or error scenario
 * @param params prompt parameters
 * @returns generated prompt
 */
export function getAddTaskPrompt(
  scenario: "success" | "error",
  params: AddTaskPromptParams
): string {
  let template: string;
  let prompt: string;

  switch (scenario) {
    case "success":
      template = loadPromptFromTemplate("addTask/success.md");
      
      // Detect language based on template content to provide appropriate status messages
      const templateSetName = process.env.TEMPLATES_USE || "en";
      const isChinese = templateSetName === "zh";
      
      // Handle conditional logic in code
      const implementationGuideStatus = params.hasImplementationGuide 
        ? (isChinese ? "✅ 已提供實現指南" : "✅ Implementation guide provided")
        : (isChinese ? "ℹ️ 未提供實現指南" : "ℹ️ No implementation guide provided");
      
      const verificationCriteriaStatus = params.hasVerificationCriteria 
        ? (isChinese ? "✅ 已提供驗證標準" : "✅ Verification criteria provided")
        : (isChinese ? "ℹ️ 未提供驗證標準" : "ℹ️ No verification criteria provided");
      
      const dependenciesNote = params.dependenciesCount && params.dependenciesCount > 0
        ? (isChinese 
            ? `⚠️ **注意：** 此任務有 ${params.dependenciesCount} 個依賴項。請確保在執行此任務之前完成所有依賴任務。`
            : `⚠️ **Note:** This task has ${params.dependenciesCount} dependencies. Make sure all dependent tasks are completed before executing this task.`)
        : "";
      
      prompt = generatePrompt(template, {
        taskName: params.taskName || "Unknown Task",
        taskId: params.taskId || "unknown-id",
        description: params.description || "No description provided",
        notes: params.notes || "No additional notes provided",
        dependenciesCount: params.dependenciesCount || 0,
        relatedFilesCount: params.relatedFilesCount || 0,
        implementationGuideStatus,
        verificationCriteriaStatus,
        dependenciesNote,
        // Add project context variables
        currentProject: params.projectContext?.currentProject || "Default Project",
        projectStatus: params.projectContext?.projectStatus || "Active",
        projectTaskCount: params.projectContext?.projectTaskCount || 0,
      });
      break;
    case "error":
      template = loadPromptFromTemplate("addTask/error.md");
      prompt = generatePrompt(template, {
        error: params.error || "Unknown error occurred",
        currentProject: params.projectContext?.currentProject || "Default Project",
      });
      break;
    default:
      template = loadPromptFromTemplate("addTask/success.md");
      prompt = generatePrompt(template, {
        ...params,
        currentProject: params.projectContext?.currentProject || "Default Project",
        projectStatus: params.projectContext?.projectStatus || "Active",
        projectTaskCount: params.projectContext?.projectTaskCount || 0,
      });
      break;
  }

  // Load possible custom prompt
  return loadPrompt(prompt, "ADD_TASK");
}
