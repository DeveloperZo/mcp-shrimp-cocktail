import { z } from "zod";
import path from "path";
import { fileURLToPath } from "url";
import { getAllTasks, loadProjectTasks } from "../../models/taskModel.js";
import { projectManager } from "../../models/projectModel.js";
import { planManager } from "../../models/planModel.js";
import { TaskStatus, Task } from "../../types/index.js";
import { getPlanTaskPrompt } from "../../prompts/index.js";
import { resolveProject } from "../../utils/projectResolver.js";

// Task planning tool
export const planTaskSchema = z.object({
  description: z
    .string()
    .min(10, {
      message: "Task description cannot be less than 10 characters, please provide more detailed description to ensure task objectives are clear",
    })
    .describe("Complete and detailed task problem description, should include task objectives, background and expected outcomes"),
  requirements: z
    .string()
    .optional()
    .describe("Specific technical requirements, business constraints or quality standards for the task (optional)"),
  existingTasksReference: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether to reference existing tasks as planning foundation, used for task adjustment and continuity planning"),
  projectName: z
    .string()
    .describe("Project name or ID where tasks should be planned. Must specify a valid project name or ID."),
});

export async function planTask({
  description,
  requirements,
  existingTasksReference = false,
  projectName,
}: z.infer<typeof planTaskSchema>) {
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
    
    // Generate plan name from description
    const planName = generatePlanName(description);
    
    // Initialize plan manager for the project
    await planManager.initialize(projectId);
    
    // Create a new plan for this task planning session
    const planResult = await planManager.createPlan(projectId, {
      name: planName,
      description: description,
      tags: requirements ? ['planning', 'requirements'] : ['planning'],
    });
    
    if (!planResult.success) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error creating new plan "${planName}": ${planResult.error || 'Unknown error occurred'}`,
          },
        ],
      };
    }
    
    // Switch to the new plan
    const switchResult = await planManager.switchPlan(projectId, planResult.planId!);
    
    if (!switchResult.success) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Warning: Plan "${planName}" created but failed to switch to it. Error: ${switchResult.error}`,
          },
        ],
      };
    }
    
    const projectContext = `plan "${planName}" in project "${targetProject.name}"`;
    
    let completedTasks: Task[] = [];
    let pendingTasks: Task[] = [];

    if (existingTasksReference) {
      const allTasks = await loadProjectTasks(projectId);
      
      completedTasks = allTasks.filter(
        (task) => task.status === TaskStatus.COMPLETED
      );
      pendingTasks = allTasks.filter(
        (task) => task.status === TaskStatus.PENDING
      );
    }

    // Get current directory path for memory storage
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const memoryDir = path.resolve(__dirname, "..", "..", "..", "memory");

    const prompt = await getPlanTaskPrompt({
      description,
      requirements,
      existingTasksReference,
      completedTasks,
      pendingTasks,
      memoryDir,
      projectContext,
    });
    
    // Prepend plan creation info to the prompt
    const fullResponse = `# ✅ New Plan Created: "${planName}"

**Plan ID:** ${planResult.planId}
**Project:** ${targetProject.name}
**Context:** You are now working in the new plan "${planName}"

---

${prompt}`;

    return {
      content: [
        {
          type: "text" as const,
          text: fullResponse,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text:
            "Error occurred during task planning: " +
            (error instanceof Error ? error.message : String(error)),
        },
      ],
    };
  }
}

/**
 * Generate a concise plan name from the task description
 */
function generatePlanName(description: string): string {
  // Take first 50 characters and clean up
  let name = description.substring(0, 50).trim();
  
  // Remove special characters and replace with spaces
  name = name.replace(/[^a-zA-Z0-9\s]/g, ' ');
  
  // Collapse multiple spaces
  name = name.replace(/\s+/g, ' ').trim();
  
  // Convert to title case words
  name = name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  // If still too long, take first 3-4 words
  const words = name.split(' ');
  if (words.length > 4) {
    name = words.slice(0, 4).join(' ');
  }
  
  // Fallback if empty
  if (!name || name.trim().length === 0) {
    name = `Plan ${new Date().toISOString().split('T')[0]}`;
  }
  
  return name;
}
