import { z } from "zod";
import { planManager } from "../../models/planModel.js";
import { projectManager } from "../../models/projectModel.js";
import { 
  PlanMetadata, 
  PlanStatus, 
  PlanCreationOptions,
} from "../../types/index.js";
import { loadPromptFromTemplate } from "../../prompts/loader.js";
import { resolveProject } from "../../utils/projectResolver.js";

/**
 * Create Plan Tool
 * Creates a new plan within a project
 */
export const createPlanSchema = z.object({
  projectName: z
    .string()
    .min(1, "Project name cannot be empty")
    .describe("Project name or ID where the plan should be created. Must specify a valid project name or ID."),
  name: z
    .string()
    .min(1, "Plan name cannot be empty")
    .max(100, "Plan name cannot exceed 100 characters")
    .describe("Name of the new plan"),
  description: z
    .string()
    .optional()
    .describe("Optional description of the plan"),
  tags: z
    .array(z.string())
    .optional()
    .describe("Optional tags for categorizing the plan"),
  copyFromPlan: z
    .string()
    .optional()
    .describe("Optional plan ID to copy tasks from"),
  parentPlanId: z
    .string()
    .optional()
    .describe("Optional parent plan ID for plan hierarchy"),
});

export async function createPlan({
  projectName,
  name,
  description,
  tags,
  copyFromPlan,
  parentPlanId,
}: z.infer<typeof createPlanSchema>) {
  try {
    // Use centralized project resolver for consistent error handling
    const projectResult = await resolveProject(projectName, {
      includeSuggestions: true,
      maxSuggestions: 3
    });
    
    let targetProject;
    
    if (!projectResult.success) {
      // Project doesn't exist - create it automatically
      await projectManager.initialize();
      const createProjectResult = await projectManager.createProject({
        name: projectName,
        description: `Project created automatically for plan "${name}"`,
      });
      
      if (!createProjectResult.success) {
        const errorMessage = loadPromptFromTemplate("planManagement/createPlan/projectNotFound.md", {
          projectName,
          error: `Failed to create project: ${createProjectResult.error || projectResult.error}`,
          suggestions: projectResult.suggestions,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: errorMessage,
            },
          ],
        };
      }
      
      // Get the newly created project
      targetProject = await projectManager.getProjectMetadata(createProjectResult.projectId!);
      if (!targetProject) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Project "${projectName}" was created but could not be retrieved.`,
            },
          ],
        };
      }
    } else {
      targetProject = projectResult.project!;
    }

    // Initialize plan manager for the project
    await planManager.initialize(targetProject.id);

    // Prepare creation options
    const options: PlanCreationOptions = {
      name,
      description,
      tags,
      copyFromPlan,
      parentPlanId,
    };

    // Create the plan
    const result = await planManager.createPlan(targetProject.id, options);

    if (!result.success) {
      const errorMessage = loadPromptFromTemplate("planManagement/createPlan/error.md", {
        planName: name,
        error: result.error || "Unknown error occurred",
      });

      return {
        content: [
          {
            type: "text" as const,
            text: errorMessage,
          },
        ],
      };
    }

    // Success response - indicate if project was auto-created
    const projectWasCreated = !projectResult.success;
    const successMessage = loadPromptFromTemplate("planManagement/createPlan/success.md", {
      planName: name,
      planId: result.planId || "unknown",
      projectName: targetProject.name,
      description: description || "No description provided",
      tags: tags?.join(", ") || "None",
      copyFromPlan: copyFromPlan || null,
      projectWasCreated: projectWasCreated ? `\n\nℹ️ **Note:** Project "${projectName}" was automatically created for this plan.` : "",
    });

    return {
      content: [
        {
          type: "text" as const,
          text: successMessage,
        },
      ],
    };

  } catch (error) {
    const errorMessage = loadPromptFromTemplate("planManagement/createPlan/unexpectedError.md", {
      planName: name,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      content: [
        {
          type: "text" as const,
          text: errorMessage,
        },
      ],
    };
  }
}

/**
 * List Plans Tool
 * Lists all plans in a project with optional filtering and statistics
 */
export const listPlansSchema = z.object({
  projectName: z
    .string()
    .min(1, "Project name cannot be empty")
    .describe("Project name or ID to list plans from. Must specify a valid project name or ID."),
  includeStats: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether to include plan statistics (task counts, etc.)"),
  status: z
    .enum(["active", "archived", "all"])
    .optional()
    .default("all")
    .describe("Filter plans by status"),
  sortBy: z
    .enum(["name", "createdAt", "updatedAt"])
    .optional()
    .default("updatedAt")
    .describe("Sort plans by specified field"),
  sortOrder: z
    .enum(["asc", "desc"])
    .optional()
    .default("desc")
    .describe("Sort order"),
});

export async function listPlans({
  projectName,
  includeStats = true,
  status = "all",
  sortBy = "updatedAt",
  sortOrder = "desc",
}: z.infer<typeof listPlansSchema>) {
  try {
    // Use centralized project resolver for consistent error handling
    const projectResult = await resolveProject(projectName, {
      includeSuggestions: true,
      maxSuggestions: 3
    });
    
    if (!projectResult.success) {
      const errorMessage = loadPromptFromTemplate("planManagement/listPlans/projectNotFound.md", {
        projectName,
        error: projectResult.error,
        suggestions: projectResult.suggestions,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: errorMessage,
          },
        ],
      };
    }
    
    const targetProject = projectResult.project!;

    // Initialize plan manager for the project
    await planManager.initialize(targetProject.id);

    // Build query options
    const queryOptions: any = {
      sortBy,
      sortOrder,
    };

    // Add status filter if not "all"
    if (status !== "all") {
      queryOptions.status = status === "active" ? PlanStatus.ACTIVE : PlanStatus.ARCHIVED;
    }

    // Get plans
    const plans = await planManager.listPlans(targetProject.id, queryOptions);

    // Get current plan context
    const currentContext = planManager.getCurrentContext(targetProject.id);
    const currentPlanId = currentContext?.currentPlanId || null;

    // Refresh stats for all plans if stats are requested
    if (includeStats) {
      for (const plan of plans) {
        await planManager.updatePlanStats(targetProject.id, plan.id);
      }
      // Re-read plans after stats update
      const updatedPlans = await planManager.listPlans(targetProject.id, queryOptions);
      plans.splice(0, plans.length, ...updatedPlans);
    }

    // Prepare template data
    const plansData = plans.map(plan => ({
      ...plan,
      isCurrent: plan.id === currentPlanId,
      formattedCreatedAt: plan.createdAt.toLocaleDateString(),
      formattedUpdatedAt: plan.updatedAt.toLocaleDateString(),
      formattedLastActivity: plan.stats?.lastActivity?.toLocaleDateString() || "Never",
      statusDisplay: plan.status === PlanStatus.ACTIVE ? "Active" : "Archived",
      taskSummary: includeStats && plan.stats ? 
        `${plan.stats.completedTasks}/${plan.stats.totalTasks} completed, ${plan.stats.activeTasks} active` :
        "Stats not available",
    }));

    const responseMessage = loadPromptFromTemplate("planManagement/listPlans/success.md", {
      projectName: targetProject.name,
      planCount: plans.length,
      currentPlanId,
      includeStats,
      status,
      sortBy,
      sortOrder,
      isMultiPlan: plans.length > 1,
      plans: plansData,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: responseMessage,
        },
      ],
    };

  } catch (error) {
    const errorMessage = loadPromptFromTemplate("planManagement/listPlans/error.md", {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      content: [
        {
          type: "text" as const,
          text: errorMessage,
        },
      ],
    };
  }
}

/**
 * Switch Plan Tool
 * Switches the current active plan within a project
 */
export const switchPlanSchema = z.object({
  projectName: z
    .string()
    .min(1, "Project name cannot be empty")
    .describe("Project name or ID where the plan resides. Must specify a valid project name or ID."),
  planName: z
    .string()
    .min(1, "Plan name cannot be empty")
    .describe("Name or ID of the plan to switch to"),
});

export async function switchPlan({
  projectName,
  planName,
}: z.infer<typeof switchPlanSchema>) {
  try {
    // Initialize project manager
    await projectManager.initialize();
    
    // Find project by name or ID
    const projects = await projectManager.listProjects();
    const targetProject = projects.find(p => 
      p.id === projectName || 
      p.name === projectName || 
      p.sanitizedName === projectName
    );

    if (!targetProject) {
      const errorMessage = loadPromptFromTemplate("planManagement/switchPlan/projectNotFound.md", {
        projectName,
        availableProjects: projects.map(p => ({ name: p.name, id: p.id })),
      });

      return {
        content: [
          {
            type: "text" as const,
            text: errorMessage,
          },
        ],
      };
    }

    // Initialize plan manager for the project
    await planManager.initialize(targetProject.id);

    // Find plan by name or ID
    const plans = await planManager.listPlans(targetProject.id);
    const targetPlan = plans.find(p => 
      p.id === planName || 
      p.name === planName || 
      p.sanitizedName === planName
    );

    if (!targetPlan) {
      const errorMessage = loadPromptFromTemplate("planManagement/switchPlan/planNotFound.md", {
        planName,
        projectName: targetProject.name,
        availablePlans: plans.map(p => ({ name: p.name, id: p.id })),
      });

      return {
        content: [
          {
            type: "text" as const,
            text: errorMessage,
          },
        ],
      };
    }

    // Get current plan for comparison
    const currentContext = planManager.getCurrentContext(targetProject.id);
    const previousPlan = currentContext?.currentPlan;

    // Switch to the target plan
    const result = await planManager.switchPlan(targetProject.id, targetPlan.id);

    if (!result.success) {
      const errorMessage = loadPromptFromTemplate("planManagement/switchPlan/error.md", {
        planName: targetPlan.name,
        error: result.error || "Unknown error occurred",
      });

      return {
        content: [
          {
            type: "text" as const,
            text: errorMessage,
          },
        ],
      };
    }

    // Success response
    const successMessage = loadPromptFromTemplate("planManagement/switchPlan/success.md", {
      previousPlanName: previousPlan?.name || "Unknown",
      previousPlanId: previousPlan?.id || "Unknown",
      newPlanName: targetPlan.name,
      newPlanId: targetPlan.id,
      projectName: targetProject.name,
      taskCount: targetPlan.stats?.totalTasks || 0,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: successMessage,
        },
      ],
    };

  } catch (error) {
    const errorMessage = loadPromptFromTemplate("planManagement/switchPlan/unexpectedError.md", {
      planName,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      content: [
        {
          type: "text" as const,
          text: errorMessage,
        },
      ],
    };
  }
}

/**
 * Delete Plan Tool
 * Deletes a plan with safety confirmation
 */
export const deletePlanSchema = z.object({
  projectName: z
    .string()
    .min(1, "Project name cannot be empty")
    .describe("Project name or ID where the plan resides. Must specify a valid project name or ID."),
  planName: z
    .string()
    .min(1, "Plan name cannot be empty")
    .describe("Name or ID of the plan to delete"),
  confirm: z
    .boolean()
    .default(false)
    .describe("Confirmation that you want to delete the plan (required for safety)"),
});

export async function deletePlan({
  projectName,
  planName,
  confirm = false,
}: z.infer<typeof deletePlanSchema>) {
  try {
    // Use centralized project resolver for consistent error handling
    const projectResult = await resolveProject(projectName, {
      includeSuggestions: true,
      maxSuggestions: 3
    });
    
    if (!projectResult.success) {
      const errorMessage = loadPromptFromTemplate("planManagement/deletePlan/projectNotFound.md", {
        projectName,
        error: projectResult.error,
        suggestions: projectResult.suggestions,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: errorMessage,
          },
        ],
      };
    }
    
    const targetProject = projectResult.project!;

    // Initialize plan manager for the project
    await planManager.initialize(targetProject.id);

    // Find plan by name or ID
    const plans = await planManager.listPlans(targetProject.id);
    const targetPlan = plans.find(p => 
      p.id === planName || 
      p.name === planName || 
      p.sanitizedName === planName
    );

    if (!targetPlan) {
      const errorMessage = loadPromptFromTemplate("planManagement/deletePlan/planNotFound.md", {
        planName,
        projectName: targetProject.name,
        availablePlans: plans.map(p => ({ name: p.name, id: p.id })),
      });

      return {
        content: [
          {
            type: "text" as const,
            text: errorMessage,
          },
        ],
      };
    }


    // Require confirmation
    if (!confirm) {
      const confirmationMessage = loadPromptFromTemplate("planManagement/deletePlan/confirmation.md", {
        planName: targetPlan.name,
        planId: targetPlan.id,
        projectName: targetProject.name,
        taskCount: targetPlan.stats?.totalTasks || 0,
        description: targetPlan.description || "No description",
      });

      return {
        content: [
          {
            type: "text" as const,
            text: confirmationMessage,
          },
        ],
      };
    }

    // Delete the plan
    const result = await planManager.deletePlan(targetProject.id, targetPlan.id, confirm);

    if (!result.success) {
      const errorMessage = loadPromptFromTemplate("planManagement/deletePlan/error.md", {
        planName: targetPlan.name,
        planId: targetPlan.id,
        error: result.error || "Unknown error occurred",
      });

      return {
        content: [
          {
            type: "text" as const,
            text: errorMessage,
          },
        ],
      };
    }

    // Success response
    const successMessage = loadPromptFromTemplate("planManagement/deletePlan/success.md", {
      planName: targetPlan.name,
      planId: targetPlan.id,
      projectName: targetProject.name,
      backupInfo: result.data?.backup ? "Backup created before deletion" : "No backup created",
    });

    return {
      content: [
        {
          type: "text" as const,
          text: successMessage,
        },
      ],
    };

  } catch (error) {
    const errorMessage = loadPromptFromTemplate("planManagement/deletePlan/unexpectedError.md", {
      planName,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      content: [
        {
          type: "text" as const,
          text: errorMessage,
        },
      ],
    };
  }
}

/**
 * Get Plan Info Tool
 * Gets detailed information about a specific plan
 */
export const getPlanInfoSchema = z.object({
  projectName: z
    .string()
    .min(1, "Project name cannot be empty")
    .describe("Project name or ID where the plan resides. Must specify a valid project name or ID."),
  planName: z
    .string()
    .optional()
    .describe("Name or ID of the plan to get info for. Leave empty for current plan."),
});

export async function getPlanInfo({
  projectName,
  planName,
}: z.infer<typeof getPlanInfoSchema>) {
  try {
    // Use centralized project resolver for consistent error handling
    const projectResult = await resolveProject(projectName, {
      includeSuggestions: true,
      maxSuggestions: 3
    });
    
    if (!projectResult.success) {
      const errorMessage = loadPromptFromTemplate("planManagement/getPlanInfo/projectNotFound.md", {
        projectName,
        error: projectResult.error,
        suggestions: projectResult.suggestions,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: errorMessage,
          },
        ],
      };
    }
    
    const targetProject = projectResult.project!;

    // Initialize plan manager for the project
    await planManager.initialize(targetProject.id);

    let targetPlan: PlanMetadata | null = null;

    if (planName) {
      // Find specific plan by name or ID
      const plans = await planManager.listPlans(targetProject.id);
      targetPlan = plans.find(p => 
        p.id === planName || 
        p.name === planName || 
        p.sanitizedName === planName
      ) || null;

      if (!targetPlan) {
        const errorMessage = loadPromptFromTemplate("planManagement/getPlanInfo/planNotFound.md", {
          planName,
          projectName: targetProject.name,
          availablePlans: plans.map(p => ({ name: p.name, id: p.id })),
        });

        return {
          content: [
            {
              type: "text" as const,
              text: errorMessage,
            },
          ],
        };
      }
    } else {
      // Get current plan
      targetPlan = await planManager.getCurrentPlan(targetProject.id);
      
      if (!targetPlan) {
        const errorMessage = loadPromptFromTemplate("planManagement/getPlanInfo/noCurrentPlan.md", {
          projectName: targetProject.name,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: errorMessage,
            },
          ],
        };
      }
    }

    // Get current context to check if this is the current plan
    const currentContext = planManager.getCurrentContext(targetProject.id);
    const isCurrent = currentContext?.currentPlanId === targetPlan.id;

    // Prepare plan information
    const planInfo = {
      ...targetPlan,
      formattedCreatedAt: targetPlan.createdAt.toLocaleDateString(),
      formattedUpdatedAt: targetPlan.updatedAt.toLocaleDateString(),
      formattedLastActivity: targetPlan.stats?.lastActivity?.toLocaleDateString() || "Never",
      statusDisplay: targetPlan.status === PlanStatus.ACTIVE ? "Active" : "Archived",
      tagsDisplay: targetPlan.tags?.join(", ") || "None",
      completionPercentage: targetPlan.stats && targetPlan.stats.totalTasks > 0 
        ? Math.round((targetPlan.stats.completedTasks / targetPlan.stats.totalTasks) * 100) 
        : 0,
    };

    const infoMessage = loadPromptFromTemplate("planManagement/getPlanInfo/success.md", {
      plan: planInfo,
      projectName: targetProject.name,
      isCurrent,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: infoMessage,
        },
      ],
    };

  } catch (error) {
    const errorMessage = loadPromptFromTemplate("planManagement/getPlanInfo/error.md", {
      planName: planName || "current",
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      content: [
        {
          type: "text" as const,
          text: errorMessage,
        },
      ],
    };
  }
}
