import { z } from "zod";
import { UUID_V4_REGEX } from "../../utils/regex.js";
import {
  getTaskById,
  updateTaskStatus,
  updateTaskSummary,
  getProjectTaskById,
  updateProjectTask,
} from "../../models/taskModel.js";
import { projectManager } from "../../models/projectModel.js";
import { TaskStatus } from "../../types/index.js";
import { getVerifyTaskPrompt } from "../../prompts/index.js";
import { resolveProject } from "../../utils/projectResolver.js";

// Task verification tool
export const verifyTaskSchema = z.object({
  taskId: z
    .string()
    .regex(UUID_V4_REGEX, {
      message: "Invalid task ID format, please provide a valid UUID v4 format",
    })
    .describe("Unique identifier of the task to be verified, must be a valid task ID existing in the system"),
  summary: z
    .string()
    .min(30, {
      message: "Minimum 30 characters",
    })
    .describe(
      "When score is 80 or above, represents task completion summary, briefly describe implementation results and important decisions. When score is below 80, represents missing or parts needing correction, minimum 30 characters"
    ),
  score: z
    .number()
    .min(0, { message: "Score cannot be less than 0" })
    .max(100, { message: "Score cannot be greater than 100" })
    .describe("Score for the task, when score equals or exceeds 80 points, task is automatically completed"),
  projectName: z
    .string()
    .describe("Project name or ID where the task resides. Must specify a valid project name or ID."),
});

export async function verifyTask({
  taskId,
  summary,
  score,
  projectName,
}: z.infer<typeof verifyTaskSchema>) {
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
  const projectId = targetProject.id;
  const projectContext = `project "${targetProject.name}"`;
  const task = await getTaskById(taskId, projectId);

  if (!task) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Task with ID ${taskId} not found in ${projectContext}. Please check if the task ID is correct.`,
        },
      ],
    };
  }

  // Update task summary
  await updateTaskSummary(taskId, summary, projectId);

  let message = "";
  let statusChanged = false;

  if (score >= 80) {
    // Score 80 or above, mark as completed
    if (task.status !== TaskStatus.COMPLETED) {
      await updateTaskStatus(taskId, TaskStatus.COMPLETED, projectId);
      statusChanged = true;
      message = `✅ **Task Completed Successfully!**\n\n**Task**: ${task.name}\n**Score**: ${score}/100\n**Summary**: ${summary}\n\nTask has been marked as completed.`;
    } else {
      message = `✅ **Task Already Completed**\n\n**Task**: ${task.name}\n**Score**: ${score}/100\n**Updated Summary**: ${summary}\n\nTask summary has been updated.`;
    }
  } else {
    // Score below 80, mark as in progress
    if (task.status !== TaskStatus.IN_PROGRESS) {
      await updateTaskStatus(taskId, TaskStatus.IN_PROGRESS, projectId);
      statusChanged = true;
    }
    message = `⚠️ **Task Needs Improvement**\n\n**Task**: ${task.name}\n**Score**: ${score}/100\n**Issues**: ${summary}\n\nPlease address the issues mentioned above and continue working on the task.`;
  }

  // Use prompt generator to get final prompt
  const prompt = getVerifyTaskPrompt({
    task,
    score,
    summary,
    projectContext,
  });

  return {
    content: [
      {
        type: "text" as const,
        text: message + "\n\n" + prompt,
      },
    ],
  };
}
