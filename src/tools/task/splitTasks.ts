import { z } from "zod";
import {
  getAllTasks,
  batchCreateOrUpdateTasks,
  clearAllTasks as modelClearAllTasks,
  loadProjectTasks,
  saveProjectTasks,
} from "../../models/taskModel.js";
import { projectManager } from "../../models/projectModel.js";
import { planManager } from "../../models/planModel.js";
import { RelatedFileType, Task } from "../../types/index.js";
import { getSplitTasksPrompt } from "../../prompts/index.js";
import { resolveProject } from "../../utils/projectResolver.js";

// Task splitting tool
export const splitTasksSchema = z.object({
  updateMode: z
    .enum(["append", "overwrite", "selective", "clearAllTasks"])
    .describe(
      "Task update mode selection: 'append' (keep all existing tasks and add new), 'overwrite' (clear all incomplete tasks and replace, keep completed), 'selective' (smart update: match by task name, keep unlisted tasks, recommended for task tuning), 'clearAllTasks' (clear all tasks and create backup). Default is 'clearAllTasks' mode, only use other modes when user requests changes or modifications"
    ),
  tasks: z
    .array(
      z.object({
        name: z
          .string()
          .max(100, {
            message: "Task name too long, please limit to 100 characters",
          })
          .describe("Concise and clear task name that clearly expresses the task purpose"),
        description: z
          .string()
          .min(10, {
            message: "Task description too short, please provide more detailed content for understanding",
          })
          .describe("Detailed task description including implementation points, technical details, and acceptance criteria"),
        implementationGuide: z
          .string()
          .describe(
            "Specific implementation methods and steps for this task, please refer to previous analysis results and provide concise pseudocode"
          ),
        dependencies: z
          .array(z.string())
          .optional()
          .describe(
            "List of prerequisite task IDs or task names that this task depends on, supports two reference methods, name reference is more intuitive, is a string array"
          ),
        notes: z
          .string()
          .optional()
          .describe("Additional notes, special handling requirements, or implementation suggestions (optional)"),
        relatedFiles: z
          .array(
            z.object({
              path: z
                .string()
                .min(1, {
                  message: "File path cannot be empty",
                })
                .describe("File path, can be relative to project root or absolute path"),
              type: z
                .nativeEnum(RelatedFileType)
                .describe(
                  "File type (TO_MODIFY: to be modified, REFERENCE: reference material, CREATE: to be created, DEPENDENCY: dependency file, OTHER: other)"
                ),
              description: z
                .string()
                .min(1, {
                  message: "File description cannot be empty",
                })
                .describe("File description explaining the purpose and content of the file"),
              lineStart: z
                .number()
                .int()
                .positive()
                .optional()
                .describe("Starting line of related code block (optional)"),
              lineEnd: z
                .number()
                .int()
                .positive()
                .optional()
                .describe("Ending line of related code block (optional)"),
            })
          )
          .optional()
          .describe(
            "List of files related to the task, used to record code files, reference materials, files to be created, etc. related to the task (optional)"
          ),
        verificationCriteria: z
          .string()
          .optional()
          .describe("Verification standards and testing methods specific to this task"),
      })
    )
    .min(1, {
      message: "Please provide at least one task",
    })
    .describe(
      "Structured task list, each task should maintain atomicity and have clear completion standards, avoid overly simple tasks, simple modifications can be integrated with other tasks, avoid too many tasks"
    ),
  globalAnalysisResult: z
    .string()
    .optional()
    .describe("Final task objective, from previous analysis applicable to all tasks' common parts"),
  projectName: z
    .string()
    .optional()
    .describe("Project name or ID to split tasks for. Recommended to specify a valid project name or ID."),
});

export async function splitTasks({
  updateMode,
  tasks,
  globalAnalysisResult,
  projectName,
}: z.infer<typeof splitTasksSchema>) {
  try {
    // Resolve project and plan context
    let projectContext = "current plan";
    let targetProjectId: string | undefined;
    let targetPlanId: string | undefined;
    
    if (projectName) {
      // Use centralized project resolver for consistent error handling
      const projectResult = await resolveProject(projectName, {
        includeSuggestions: true,
        maxSuggestions: 3
      });
      
      if (!projectResult.success) {
        return {
          content: [
            {
              type: "text" as const,
              text: projectResult.error || `Failed to resolve project: ${projectName}`,
            },
          ],
        };
      }
      
      const targetProject = projectResult.project!;
      targetProjectId = targetProject.id;
      
      // Initialize plan manager and get current plan
      await planManager.initialize(targetProjectId);
      const currentPlan = await planManager.getCurrentPlan(targetProjectId);
      
      if (currentPlan) {
        targetPlanId = currentPlan.id;
        projectContext = `plan "${currentPlan.name}" in project "${targetProject.name}"`;
      } else {
        projectContext = `project "${targetProject.name}" (no active plan)`;
      }
    }
    
    // Check if there are duplicate names in tasks
    const nameSet = new Set();
    for (const task of tasks) {
      if (nameSet.has(task.name)) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Duplicate task names found in tasks parameter, please ensure each task name is unique",
            },
          ],
        };
      }
      nameSet.add(task.name);
    }

    // Handle tasks according to different update modes
    let message = "";
    let actionSuccess = true;
    let backupFile = null;
    let createdTasks: Task[] = [];
    let allTasks: Task[] = [];

    // Convert task data to format compatible with batchCreateOrUpdateTasks
    const convertedTasks = tasks.map((task) => ({
      name: task.name,
      description: task.description,
      notes: task.notes,
      dependencies: task.dependencies,
      implementationGuide: task.implementationGuide,
      verificationCriteria: task.verificationCriteria,
      relatedFiles: task.relatedFiles?.map((file) => ({
        path: file.path,
        type: file.type as RelatedFileType,
        description: file.description,
        lineStart: file.lineStart,
        lineEnd: file.lineEnd,
      })),
    }));

    // Handle clearAllTasks mode
    if (updateMode === "clearAllTasks") {
      const clearResult = await modelClearAllTasks(targetProjectId, targetPlanId);

      if (clearResult.success) {
        message = clearResult.message;
        backupFile = clearResult.backupFile;

        try {
          // Create new tasks after clearing all tasks
          createdTasks = await batchCreateOrUpdateTasks(
            convertedTasks,
            "append",
            globalAnalysisResult,
            targetProjectId,
            targetPlanId
          );
          message += `\nSuccessfully created ${createdTasks.length} new tasks.`;
        } catch (error) {
          actionSuccess = false;
          message += `\nError occurred while creating new tasks: ${
            error instanceof Error ? error.message : String(error)
          }`;
        }
      } else {
        actionSuccess = false;
        message = clearResult.message;
      }
    } else {
      // For other modes, use batchCreateOrUpdateTasks directly
      try {
        createdTasks = await batchCreateOrUpdateTasks(
          convertedTasks,
          updateMode,
          globalAnalysisResult,
          targetProjectId,
          targetPlanId
        );

        // Generate messages based on different update modes
        switch (updateMode) {
          case "append":
            message = `Successfully appended ${createdTasks.length} new tasks.`;
            break;
          case "overwrite":
            message = `Successfully cleared incomplete tasks and created ${createdTasks.length} new tasks.`;
            break;
          case "selective":
            message = `Successfully selectively updated/created ${createdTasks.length} tasks.`;
            break;
        }
      } catch (error) {
        actionSuccess = false;
        message = `Task creation failed: ${
          error instanceof Error ? error.message : String(error)
        }`;
      }
    }

    // Get all tasks for displaying dependency relationships
    try {
      allTasks = await loadProjectTasks(targetProjectId, targetPlanId);
    } catch (error) {
      allTasks = [...createdTasks]; // If fetching fails, at least use the newly created tasks
    }

    // Use prompt generator to get final prompt
    const prompt = getSplitTasksPrompt({
      updateMode,
      createdTasks,
      allTasks,
      projectContext,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: prompt,
        },
      ],
      ephemeral: {
        taskCreationResult: {
          success: actionSuccess,
          message,
          backupFilePath: backupFile,
        },
      },
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text:
            "Error occurred while executing task splitting: " +
            (error instanceof Error ? error.message : String(error)),
        },
      ],
    };
  }
}
