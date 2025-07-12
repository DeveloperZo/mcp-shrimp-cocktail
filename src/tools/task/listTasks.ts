import { z } from "zod";
import { getAllTasks, loadProjectTasks } from "../../models/taskModel.js";
import { projectManager } from "../../models/projectModel.js";
import { TaskStatus } from "../../types/index.js";
import { getListTasksPrompt } from "../../prompts/index.js";
import { resolveProject } from "../../utils/projectResolver.js";

export const listTasksSchema = z.object({
  status: z
    .enum(["all", "pending", "in_progress", "completed"])
    .describe("要列出的任務狀態，可選擇 'all' 列出所有任務，或指定具體狀態"),
  projectName: z
    .string()
    .describe("Project name or ID to list tasks from. Must specify a valid project name or ID."),
});

// 列出任務工具
export async function listTasks({ status, projectName }: z.infer<typeof listTasksSchema>) {
  try {
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
    
    // Load tasks using project name to allow proper resolution to project ID and current plan
    const tasks = await loadProjectTasks(projectName);
    const projectContext = `project "${targetProject.name}"`;
  
    
    let filteredTasks = tasks;
  switch (status) {
    case "all":
      break;
    case "pending":
      filteredTasks = tasks.filter(
        (task) => task.status === TaskStatus.PENDING
      );
      break;
    case "in_progress":
      filteredTasks = tasks.filter(
        (task) => task.status === TaskStatus.IN_PROGRESS
      );
      break;
    case "completed":
      filteredTasks = tasks.filter(
        (task) => task.status === TaskStatus.COMPLETED
      );
      break;
  }

  if (filteredTasks.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: `## 系統通知\n\n目前系統中沒有${
            status === "all" ? "任何" : `任何 ${status} 的`
          }任務。請查詢其他狀態任務或先使用「split_tasks」工具創建任務結構，再進行後續操作。`,
        },
      ],
    };
  }

  const tasksByStatus = tasks.reduce((acc, task) => {
    if (!acc[task.status]) {
      acc[task.status] = [];
    }
    acc[task.status].push(task);
    return acc;
  }, {} as Record<string, typeof tasks>);

  // 使用prompt生成器獲取最終prompt
  const prompt = getListTasksPrompt({
  status,
  tasks: tasksByStatus,
  allTasks: filteredTasks,
    projectContext,
    });

  return {
  content: [
  {
  type: "text" as const,
    text: prompt,
    },
    ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error listing tasks: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}
