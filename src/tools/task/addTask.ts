import { z } from "zod";
import { createTask } from "../../models/taskModel.js";
import { RelatedFileType } from "../../types/index.js";
import { getAddTaskPrompt } from "../../prompts/index.js";
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
      const response = getAddTaskPrompt("error", {
        error: projectResult.error || `Failed to resolve project: ${args.projectName}`,
      });
      
      return {
        content: [{ type: "text", text: response }],
      };
    }
    
    const projectId = projectResult.project!.id;
    
    // Create the task using the model
    const newTask = await createTask(
      args.name,
      args.description,
      args.notes,
      args.dependencies || [],
      args.relatedFiles,
      projectId
    );

    // Update additional fields if provided
    if (args.implementationGuide || args.verificationCriteria) {
      const { updateTask } = await import("../../models/taskModel.js");
      const updates: any = {};
      
      if (args.implementationGuide) {
        updates.implementationGuide = args.implementationGuide;
      }
      
      if (args.verificationCriteria) {
        updates.verificationCriteria = args.verificationCriteria;
      }
      
      await updateTask(newTask.id, updates, projectId);
    }

    // Generate response using template
    const response = getAddTaskPrompt("success", {
      taskName: newTask.name,
      taskId: newTask.id,
      description: newTask.description,
      notes: newTask.notes || "No additional notes provided",
      dependenciesCount: (args.dependencies || []).length,
      relatedFilesCount: (args.relatedFiles || []).length,
      hasImplementationGuide: !!args.implementationGuide,
      hasVerificationCriteria: !!args.verificationCriteria,
    });

    return {
      content: [{ type: "text", text: response }],
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    const response = getAddTaskPrompt("error", {
      error: errorMsg,
    });

    return {
      content: [{ type: "text", text: response }],
    };
  }
}
