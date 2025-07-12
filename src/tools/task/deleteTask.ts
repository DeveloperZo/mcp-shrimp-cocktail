import { z } from "zod";
import { UUID_V4_REGEX } from "../../utils/regex.js";
import {
  getTaskById,
  deleteTask as modelDeleteTask,
  getProjectTaskById,
  deleteProjectTask,
} from "../../models/taskModel.js";
import { projectManager } from "../../models/projectModel.js";
import { TaskStatus } from "../../types/index.js";
import { getDeleteTaskPrompt } from "../../prompts/index.js";
import { resolveProject } from "../../utils/projectResolver.js";

// 刪除任務工具
export const deleteTaskSchema = z.object({
  taskId: z
    .string()
    .regex(UUID_V4_REGEX, {
      message: "任務ID格式無效，請提供有效的UUID v4格式",
    })
    .describe("待刪除任務的唯一標識符，必須是系統中存在且未完成的任務ID"),
  projectName: z
    .string()
    .describe("Project name or ID where the task resides. Must specify a valid project name or ID."),
});

export async function deleteTask({ taskId, projectName }: z.infer<typeof deleteTaskSchema>) {
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
      isError: true,
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
          text: getDeleteTaskPrompt({ taskId, projectContext }),
        },
      ],
      isError: true,
    };
  }

  if (task.status === TaskStatus.COMPLETED) {
    return {
      content: [
        {
          type: "text" as const,
          text: getDeleteTaskPrompt({ taskId, task, isTaskCompleted: true, projectContext }),
        },
      ],
      isError: true,
    };
  }

  const result = await modelDeleteTask(taskId, projectId);

  return {
    content: [
      {
        type: "text" as const,
        text: getDeleteTaskPrompt({
          taskId,
          task,
          success: result.success,
          message: result.message,
          projectContext,
        }),
      },
    ],
    isError: !result.success,
  };
}
