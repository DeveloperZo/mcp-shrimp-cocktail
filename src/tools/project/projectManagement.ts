import { z } from "zod";
import { projectManager } from "../../models/projectModel.js";
import { 
  ProjectMetadata, 
  ProjectStatus, 
  ProjectQueryOptions,
  ProjectCreationOptions,
} from "../../types/index.js";
import { loadPromptFromTemplate } from "../../prompts/loader.js";
import { resolveProject } from "../../utils/projectResolver.js";

/**
 * Create Project Tool
 * Creates a new project with optional configuration
 */
export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, "Project name cannot be empty")
    .max(100, "Project name cannot exceed 100 characters")
    .describe("Name of the new project"),
  description: z
    .string()
    .optional()
    .describe("Optional description of the project"),
  setAsDefault: z
    .boolean()
    .optional()
    .default(false)
    .describe("@deprecated This parameter is ignored. There is no longer a concept of 'current project'. Specify projectName in each command instead."),
  copyFromProject: z
    .string()
    .optional()
    .describe("Optional project ID or name to copy tasks from"),
  tags: z
    .array(z.string())
    .optional()
    .describe("Optional tags for categorizing the project"),
});

export async function createProject({
  name,
  description,
  setAsDefault = false,
  copyFromProject,
  tags,
}: z.infer<typeof createProjectSchema>) {
  try {
    // Initialize project manager
    await projectManager.initialize();

    // Prepare creation options
    const options: ProjectCreationOptions = {
      name,
      description,
      tags,
      copyFromProject,
    };

    // Create the project
    const result = await projectManager.createProject(options);

    if (!result.success) {
      const errorMessage = loadPromptFromTemplate("projectManagement/createProject/error.md", {
        projectName: name,
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

    // Note: setAsDefault parameter is deprecated and ignored

    // Success response
    const successMessage = loadPromptFromTemplate("projectManagement/createProject/success.md", {
      projectName: name,
      projectId: result.projectId || "unknown",
      description: description || "No description provided",
      isCurrentProject: false, // Deprecated concept
      copyFromProject: copyFromProject || null,
      tags: tags?.join(", ") || "None",
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
    const errorMessage = loadPromptFromTemplate("projectManagement/createProject/unexpectedError.md", {
      projectName: name,
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
 * List Projects Tool
 * Lists all projects with optional filtering and statistics
 */
export const listProjectsSchema = z.object({
  includeStats: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether to include project statistics (task counts, etc.)"),
  status: z
    .enum(["active", "archived", "all"])
    .optional()
    .default("all")
    .describe("Filter projects by status"),
  sortBy: z
    .enum(["name", "createdAt", "updatedAt", "lastActivity"])
    .optional()
    .default("updatedAt")
    .describe("Sort projects by specified field"),
  sortOrder: z
    .enum(["asc", "desc"])
    .optional()
    .default("desc")
    .describe("Sort order"),
});

export async function listProjects({
  includeStats = true,
  status = "all",
  sortBy = "updatedAt",
  sortOrder = "desc",
}: z.infer<typeof listProjectsSchema>) {
  try {
    // Initialize project manager
    await projectManager.initialize();

    // Build query options
    const queryOptions: ProjectQueryOptions = {
      sortBy,
      sortOrder,
    };

    // Add status filter if not "all"
    if (status !== "all") {
      queryOptions.status = status === "active" ? ProjectStatus.ACTIVE : ProjectStatus.ARCHIVED;
    }

    // Get projects
    const projects = await projectManager.listProjects(queryOptions);

    // Note: Current project concept has been deprecated
    const currentProjectId = null;

    // Prepare template data
    const projectsData = projects.map(project => ({
      ...project,
      isCurrent: false, // Deprecated concept
      formattedCreatedAt: project.createdAt.toLocaleDateString(),
      formattedUpdatedAt: project.updatedAt.toLocaleDateString(),
      formattedLastActivity: project.stats?.lastActivity?.toLocaleDateString() || "Never",
      statusDisplay: project.status === ProjectStatus.ACTIVE ? "Active" : "Archived",
      taskSummary: includeStats && project.stats ? 
        `${project.stats.completedTasks}/${project.stats.totalTasks} completed, ${project.stats.activeTasks} active` :
        "Stats not available",
    }));

    const responseMessage = loadPromptFromTemplate("projectManagement/listProjects/success.md", {
      projectCount: projects.length,
      currentProjectId: "none", // Deprecated concept
      includeStats,
      status,
      sortBy,
      sortOrder,
      isMultiProject: projects.length > 1,
      projects: projectsData,
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
    const errorMessage = loadPromptFromTemplate("projectManagement/listProjects/error.md", {
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
 * Switch Project Tool
 * @deprecated The concept of "current project" has been removed. Use projectName parameter on each tool instead.
 * This function is kept for backwards compatibility but will always return a deprecation notice.
 */
export const switchProjectSchema = z.object({
  projectName: z
    .string()
    .min(1, "Project name cannot be empty")
    .describe("Name or ID of the project to switch to"),
  setAsDefault: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether to set this as the default current project"),
});

export async function switchProject({
  projectName,
  setAsDefault = true,
}: z.infer<typeof switchProjectSchema>) {
  // Return deprecation notice
  return {
    content: [
      {
        type: "text" as const,
        text: `## ⚠️ Deprecated Function\n\nThe \'switch_project\' function has been deprecated. The concept of a "current project" has been removed from the system.\n\n### What Changed?\n\nInstead of switching projects, you now specify the project directly in each command using the \'projectName\' parameter.\n\n### How to Use the New System\n\nSimply add \'projectName="${projectName}"\' to any task command:\n\n\`\`\`\nlist_tasks projectName="${projectName}" status="all"\nadd_task projectName="${projectName}" name="New task" description="Task description"\nexecute_task projectName="${projectName}" taskId="task-id-here"\n\`\`\`\n\n### Benefits\n\n- **Explicit**: Always know which project you're working with\n- **No Hidden State**: No need to remember what the "current" project is\n- **Safer**: Impossible to accidentally work in the wrong project\n- **Clearer Scripts**: Commands are self-documenting\n\nUse \'list_projects\' to see all available projects.`,
      },
    ],
  };
}

/**
 * Delete Project Tool
 * Deletes a project with safety confirmation
 */
export const deleteProjectSchema = z.object({
  projectName: z
    .string()
    .min(1, "Project name cannot be empty")
    .describe("Name or ID of the project to delete"),
  confirm: z
    .boolean()
    .default(false)
    .describe("Confirmation that you want to delete the project (required for safety)"),
});

export async function deleteProject({
  projectName,
  confirm = false,
}: z.infer<typeof deleteProjectSchema>) {
  try {
    // Use centralized project resolver for consistent error handling
    const projectResult = await resolveProject(projectName, {
      includeSuggestions: true,
      maxSuggestions: 3
    });
    
    if (!projectResult.success) {
      const errorMessage = loadPromptFromTemplate("projectManagement/deleteProject/notFound.md", {
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

    // Check for default project protection
    if (targetProject.id === "default") {
      const errorMessage = loadPromptFromTemplate("projectManagement/deleteProject/defaultProtection.md", {
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

    // Require confirmation
    if (!confirm) {
      const confirmationMessage = loadPromptFromTemplate("projectManagement/deleteProject/confirmation.md", {
        projectName: targetProject.name,
        projectId: targetProject.id,
        taskCount: targetProject.stats?.totalTasks || 0,
        description: targetProject.description || "No description",
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

    // Delete the project
    const result = await projectManager.deleteProject(targetProject.id, confirm);

    if (!result.success) {
      const errorMessage = loadPromptFromTemplate("projectManagement/deleteProject/error.md", {
        projectName: targetProject.name,
        projectId: targetProject.id,
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
    const successMessage = loadPromptFromTemplate("projectManagement/deleteProject/success.md", {
      projectName: targetProject.name,
      projectId: targetProject.id,
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
    const errorMessage = loadPromptFromTemplate("projectManagement/deleteProject/unexpectedError.md", {
      projectName,
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
 * Get Project Info Tool
 * Gets detailed information about a specific project
 */
export const getProjectInfoSchema = z.object({
  projectName: z
    .string()
    .describe("Name or ID of the project to get info for. Must specify a valid project name or ID."),
});

export async function getProjectInfo({
  projectName,
}: z.infer<typeof getProjectInfoSchema>) {
  try {
    // Use centralized project resolver for consistent error handling
    const projectResult = await resolveProject(projectName, {
      includeSuggestions: true,
      maxSuggestions: 3
    });
    
    if (!projectResult.success) {
      const errorMessage = loadPromptFromTemplate("projectManagement/getProjectInfo/notFound.md", {
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



    // Prepare project information
    const projectInfo = {
      ...targetProject,
      formattedCreatedAt: targetProject.createdAt.toLocaleDateString(),
      formattedUpdatedAt: targetProject.updatedAt.toLocaleDateString(),
      formattedLastActivity: targetProject.stats?.lastActivity?.toLocaleDateString() || "Never",
      statusDisplay: targetProject.status === ProjectStatus.ACTIVE ? "Active" : "Archived",
      tagsDisplay: targetProject.tags?.join(", ") || "None",
      configDisplay: {
        templateLanguage: targetProject.config?.templateLanguage || "en",
        autoBackup: targetProject.config?.autoBackup ? "Enabled" : "Disabled",
      },
    };

    const infoMessage = loadPromptFromTemplate("projectManagement/getProjectInfo/success.md", {
      project: projectInfo,
      isCurrent: false, // Deprecated concept - no longer tracking current project
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
    const errorMessage = loadPromptFromTemplate("projectManagement/getProjectInfo/error.md", {
      projectName: projectName || "current",
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
