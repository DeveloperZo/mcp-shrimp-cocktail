import { z } from "zod";
import {
  getAllTasks,
  clearAllTasks as modelClearAllTasks,
} from "../../models/taskModel.js";
import { getClearAllTasksPrompt } from "../../prompts/index.js";
import { resolveProject } from "../../utils/projectResolver.js";

// 清除所有任務工具
export const clearAllTasksSchema = z.object({
  confirm: z
    .boolean()
    .refine((val) => val === true, {
      message:
        "必須明確確認清除操作，請將 confirm 參數設置為 true 以確認此危險操作",
    })
    .describe("確認刪除所有未完成的任務（此操作不可逆）"),
  projectName: z
    .string()
    .describe("Project name or ID where tasks should be cleared. Must specify a valid project name or ID."),
});

export async function clearAllTasks({
  confirm,
  projectName,
}: z.infer<typeof clearAllTasksSchema>) {
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
  
  const projectId = projectResult.project!.id;
  // 安全檢查：如果沒有確認，則拒絕操作
  if (!confirm) {
    return {
      content: [
        {
          type: "text" as const,
          text: getClearAllTasksPrompt({ confirm: false }),
        },
      ],
    };
  }

  // 檢查是否真的有任務需要清除
  const allTasks = await getAllTasks(projectId);
  if (allTasks.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: getClearAllTasksPrompt({ isEmpty: true }),
        },
      ],
    };
  }

  // 執行清除操作
  const result = await modelClearAllTasks(projectId);

  return {
    content: [
      {
        type: "text" as const,
        text: getClearAllTasksPrompt({
          success: result.success,
          message: result.message,
          backupFile: result.backupFile,
        }),
      },
    ],
    isError: !result.success,
  };
}
