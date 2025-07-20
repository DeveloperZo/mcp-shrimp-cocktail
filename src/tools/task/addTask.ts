import { z } from "zod";
import { createProjectTask } from "../../models/taskModel.js";
import { RelatedFileType } from "../../types/index.js";
import { loadPromptFromTemplate } from "../../prompts/loader.js";
import { resolveProject } from "../../utils/projectResolver.js";

// Add single task tool schema
export const addTaskSchema = z.object({
  projectName: z
    .string()
    .describe("Project name or ID where this task should be added. Must specify a valid project name or ID."),
  name: z
    .string()
    .min(1, "Task name cannot be empty")
    .max(100, "Task name too long, please limit to 100 characters")
    .describe("Concise and clear task name that clearly expresses the task purpose"),
  description: z
    .string()
    .min(10, "Task description too short, please provide more detailed content")
    .describe("Detailed task description including implementation points, technical details, and acceptance criteria"),
  notes: z
    .string()
    .optional()
    .describe("Additional notes, special handling requirements, or implementation suggestions (optional)"),
  dependencies: z
    .array(z.string())
    .optional()
    .default([])
    .describe("List of prerequisite task IDs that this task depends on (optional)"),
  relatedFiles: z
    .array(
      z.object({
        path: z
          .string()
          .min(1, "File path cannot be empty")
          .describe("File path, can be relative to project root or absolute path"),
        type: z
          .nativeEnum(RelatedFileType)
          .describe("File relationship type (TO_MODIFY, REFERENCE, CREATE, DEPENDENCY, OTHER)"),
        description: z
          .string()
          .optional()
          .describe("Additional description of the file (optional)"),
        lineStart: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Start line of relevant code block (optional)"),
        lineEnd: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("End line of relevant code block (optional)"),
      })
      .refine(
        (data) => {
          if (data.lineStart && data.lineEnd) {
            return data.lineStart <= data.lineEnd;
          }
          return true;
        },
        {
          message: "lineStart must be less than or equal to lineEnd",
        }
      )
    )
    .optional()
    .describe("Files related to this task, used to record code files, reference materials, files to be created, etc. (optional)"),
  implementationGuide: z
    .string()
    .optional()
    .describe("Specific implementation methods and steps for this task (optional)"),
  verificationCriteria: z
    .string()
    .optional()
    .describe("Verification standards and inspection methods for this task (optional)"),
});

export type AddTaskArgs = z.infer<typeof addTaskSchema>;

// Add single task function
export async function addTask(args: AddTaskArgs) {
  try {
    // Use centralized project resolver for consistent error handling
    const projectResult = await resolveProject(args.projectName, {
      includeSuggestions: true,
      maxSuggestions: 3
    });
    
    if (!projectResult.success) {
      const response = loadPromptFromTemplate("addTask/error.md", {
        error: projectResult.error || `Failed to resolve project: ${args.projectName}`,
      });
      
      return {
        content: [{ type: "text", text: response }],
      };
    }
    
    const projectId = projectResult.project!.id;
    
    // Create the task using createProjectTask for consistency
    const newTask = await createProjectTask(
      {
        name: args.name,
        description: args.description,
        notes: args.notes,
        dependencies: args.dependencies || [],
        relatedFiles: args.relatedFiles,
        implementationGuide: args.implementationGuide,
        verificationCriteria: args.verificationCriteria,
      },
      projectId
    );

    // Generate response using template
    const dependenciesCount = (args.dependencies || []).length;
    const relatedFilesCount = (args.relatedFiles || []).length;
    const hasImplementationGuide = !!args.implementationGuide;
    const hasVerificationCriteria = !!args.verificationCriteria;
    
    // Detect language based on template environment setting
    const templateSetName = process.env.TEMPLATES_USE || "en";
    const isChinese = templateSetName === "zh";
    
    // Handle conditional logic for implementation guide status
    const implementationGuideStatus = hasImplementationGuide 
      ? (isChinese ? "✅ 已提供實現指南" : "✅ Implementation guide provided")
      : (isChinese ? "ℹ️ 未提供實現指南" : "ℹ️ No implementation guide provided");
    
    // Handle conditional logic for verification criteria status
    const verificationCriteriaStatus = hasVerificationCriteria 
      ? (isChinese ? "✅ 已提供驗證標準" : "✅ Verification criteria provided")
      : (isChinese ? "ℹ️ 未提供驗證標準" : "ℹ️ No verification criteria provided");
    
    // Handle dependencies note
    const dependenciesNote = dependenciesCount > 0
      ? (isChinese 
          ? `⚠️ **注意：** 此任務有 ${dependenciesCount} 個依賴項。請確保在執行此任務之前完成所有依賴任務。`
          : `⚠️ **Note:** This task has ${dependenciesCount} dependencies. Make sure all dependent tasks are completed before executing this task.`)
      : "";
    
    const response = loadPromptFromTemplate("addTask/success.md", {
      taskName: newTask.name,
      taskId: newTask.id,
      currentProject: projectResult.project!.name,
      description: newTask.description,
      notes: newTask.notes || "No additional notes provided",
      dependenciesCount,
      relatedFilesCount,
      implementationGuideStatus,
      verificationCriteriaStatus,
      projectStatus: "Active",
      projectTaskCount: 0, // This would need to be fetched from project stats if available
      dependenciesNote,
    });

    return {
      content: [{ type: "text", text: response }],
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    const response = loadPromptFromTemplate("addTask/error.md", {
      error: errorMsg,
    });

    return {
      content: [{ type: "text", text: response }],
    };
  }
}
