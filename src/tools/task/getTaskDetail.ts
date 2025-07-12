import { z } from "zod";
import { searchTasksWithCommand, getProjectTaskById, loadProjectTasks } from "../../models/taskModel.js";
import { projectManager } from "../../models/projectModel.js";
import { getGetTaskDetailPrompt } from "../../prompts/index.js";
import { resolveProject } from "../../utils/projectResolver.js";

// 取得完整任務詳情的參數
export const getTaskDetailSchema = z.object({
  taskId: z
    .string()
    .min(1, {
      message: "任務ID不能為空，請提供有效的任務ID",
    })
    .describe("欲檢視詳情的任務ID"),
  projectName: z
    .string()
    .describe("Project name or ID where the task resides. Must specify a valid project name or ID."),
});

// 取得任務完整詳情
export async function getTaskDetail({
  taskId,
  projectName,
}: z.infer<typeof getTaskDetailSchema>) {
  let projectContext = `project "${projectName}"`; // Initialize with fallback
  
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
        isError: true,
      };
    }
    
    const targetProject = projectResult.project!;
    const projectId = targetProject.id;
    projectContext = `project "${targetProject.name}"`; // Update with actual project name
    
    // Get task from specific project
    const foundTask = await getProjectTaskById(taskId, projectId);
    
    const result = {
      tasks: foundTask ? [foundTask] : [],
    };

    // 檢查是否找到任務
    if (result.tasks.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `## 錯誤\n\n找不到ID為 \`${taskId}\` 的任務在${projectContext}中。請確認任務ID是否正確。`,
          },
        ],
        isError: true,
      };
    }

    // 獲取找到的任務（第一個也是唯一的一個）
    const task = result.tasks[0];

    // 使用prompt生成器獲取最終prompt
    const prompt = getGetTaskDetailPrompt({
      taskId,
      task,
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
    // 使用prompt生成器獲取錯誤訊息
    const errorPrompt = getGetTaskDetailPrompt({
      taskId,
      error: error instanceof Error ? error.message : String(error),
      projectContext,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: errorPrompt,
        },
      ],
    };
  }
}
