import { z } from "zod";
import { searchTasksWithCommand, loadProjectTasks } from "../../models/taskModel.js";
import { projectManager } from "../../models/projectModel.js";
import { getQueryTaskPrompt } from "../../prompts/index.js";
import { resolveProject } from "../../utils/projectResolver.js";

// 查詢任務工具
export const queryTaskSchema = z.object({
  query: z
    .string()
    .min(1, {
      message: "查詢內容不能為空，請提供任務ID或搜尋關鍵字",
    })
    .describe("搜尋查詢文字，可以是任務ID或多個關鍵字（空格分隔）"),
  isId: z
    .boolean()
    .optional()
    .default(false)
    .describe("指定是否為ID查詢模式，默認為否（關鍵字模式）"),
  page: z
    .number()
    .int()
    .positive()
    .optional()
    .default(1)
    .describe("分頁頁碼，默認為第1頁"),
  pageSize: z
    .number()
    .int()
    .positive()
    .min(1)
    .max(20)
    .optional()
    .default(5)
    .describe("每頁顯示的任務數量，默認為5筆，最大20筆"),
  projectName: z
    .string()
    .describe("Project name or ID to search tasks in. Must specify a valid project name or ID."),
});

export async function queryTask({
  query,
  isId = false,
  page = 1,
  pageSize = 3,
  projectName,
}: z.infer<typeof queryTaskSchema>) {
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
    const projectId = targetProject.id;
    const projectContext = `project "${targetProject.name}"`;
    
    // Load project tasks and perform manual search
    const projectTasks = await loadProjectTasks(projectId);
      
      // Filter tasks based on query
      const filteredTasks = isId 
        ? projectTasks.filter(task => task.id === query)
        : projectTasks.filter(task => {
            const keywords = query.split(/\s+/).filter(k => k.length > 0);
            if (keywords.length === 0) return true;
            
            return keywords.every(keyword => {
              const lowerKeyword = keyword.toLowerCase();
              return (
                task.name.toLowerCase().includes(lowerKeyword) ||
                task.description.toLowerCase().includes(lowerKeyword) ||
                (task.notes && task.notes.toLowerCase().includes(lowerKeyword)) ||
                (task.implementationGuide && task.implementationGuide.toLowerCase().includes(lowerKeyword)) ||
                (task.summary && task.summary.toLowerCase().includes(lowerKeyword))
              );
            });
          });
          
      // Sort tasks by update/completion time
      filteredTasks.sort((a, b) => {
        if (a.completedAt && b.completedAt) {
          return b.completedAt.getTime() - a.completedAt.getTime();
        } else if (a.completedAt) {
          return -1;
        } else if (b.completedAt) {
          return 1;
        }
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      });
      
      // Apply pagination
      const totalResults = filteredTasks.length;
      const totalPages = Math.ceil(totalResults / pageSize);
      const safePage = Math.max(1, Math.min(page, totalPages || 1));
      const startIndex = (safePage - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, totalResults);
      const paginatedTasks = filteredTasks.slice(startIndex, endIndex);
      
      const results = {
        tasks: paginatedTasks,
        pagination: {
          currentPage: safePage,
          totalPages: totalPages || 1,
          totalResults,
          hasMore: safePage < totalPages,
        },
      };

    // 使用prompt生成器獲取最終prompt
    const prompt = getQueryTaskPrompt({
      query,
      isId,
      tasks: results.tasks,
      totalTasks: results.pagination.totalResults,
      page: results.pagination.currentPage,
      pageSize,
      totalPages: results.pagination.totalPages,
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
          text: `## 系統錯誤\n\n查詢任務時發生錯誤: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}
