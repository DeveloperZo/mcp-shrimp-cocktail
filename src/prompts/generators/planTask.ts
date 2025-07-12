/**
 * planTask prompt generator
 * Responsible for combining templates and parameters into the final prompt
 */

import {
  loadPrompt,
  generatePrompt,
  loadPromptFromTemplate,
} from "../loader.js";
import { Task, TaskDependency } from "../../types/index.js";

/**
 * planTask prompt parameters interface
 */
export interface PlanTaskPromptParams {
  description: string;
  requirements?: string;
  existingTasksReference?: boolean;
  completedTasks?: Task[];
  pendingTasks?: Task[];
  memoryDir: string;
  projectContext?: string;
}

/**
 * Get the complete planTask prompt
 * @param params prompt parameters
 * @returns generated prompt
 */
export function getPlanTaskPrompt(params: PlanTaskPromptParams): string {
  const {
    description,
    requirements,
    existingTasksReference,
    completedTasks,
    pendingTasks,
    memoryDir,
  } = params;

  const requirementsTemplate = loadPromptFromTemplate("planTask/requirements.md");
  let requirementsPrompt = "";
  if (requirements) {
    requirementsPrompt = generatePrompt(requirementsTemplate, {
      requirements,
    });
  }

  const existingTasksTemplate = loadPromptFromTemplate(
    "planTask/tasks.md"
  );
  let existingTasksPrompt = "";
  if (existingTasksReference && (completedTasks?.length || pendingTasks?.length)) {
    let completedTasksContent = "";
    if (completedTasks && completedTasks.length > 0) {
      for (const task of completedTasks) {
        completedTasksContent += `### ${task.name}\n${
          task.summary || "*No completion summary*"
        }\n\n`;
      }
    }

    let unfinishedTasksContent = "";
    if (pendingTasks && pendingTasks.length > 0) {
      for (const task of pendingTasks) {
        const dependenciesStr = task.dependencies
          ? task.dependencies
              .map((dep: TaskDependency) => dep.taskId)
              .join(", ")
          : "No dependencies";
        unfinishedTasksContent += `### ${task.name}\n**Description**: ${task.description}\n**Dependencies**: ${dependenciesStr}\n\n`;
      }
    }

    existingTasksPrompt = generatePrompt(existingTasksTemplate, {
      completedTasks: completedTasksContent || "*No completed tasks*",
      unfinishedTasks: unfinishedTasksContent || "*No unfinished tasks*",
    });
  }

  const indexTemplate = loadPromptFromTemplate("planTask/index.md");
  const prompt = generatePrompt(indexTemplate, {
    description,
    requirements: requirementsPrompt,
    tasksTemplate: existingTasksPrompt,
    memoryDir,
  });

  // Load possible custom prompt
  return loadPrompt(prompt, "PLAN_TASK");
}
