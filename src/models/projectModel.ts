/**
 * Project Management Model
 * 
 * Handles project lifecycle operations including creation, deletion, listing,
 * and metadata management using folder-per-project architecture.
 */

import {
  ProjectMetadata,
  ProjectStatus,
  ProjectContext,
  ProjectConfig,
  ProjectStats,
  ProjectCreationOptions,
  ProjectQueryOptions,
  ProjectOperationResult,
  ProjectBackup,
  PlanContext,
} from "../types/index.js";
import { sanitizeProjectName, validateProjectName, getDataDir } from "../utils/index.js";
import { 
  PROJECTS_FILE_NAME,
  CONTEXT_FILE_NAMES,
  DATA_DIR_NAME
} from "../utils/constants.js";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from "url";

// Use utility functions instead of hardcoded paths

/**
 * ProjectManager Class
 * 
 * Core class for managing projects in the MCP Shrimp Task Manager Enhanced system.
 * Provides complete project lifecycle management with backwards compatibility.
 */
export class ProjectManager {
  private static instance: ProjectManager;
  private projectsCache: Map<string, ProjectMetadata> = new Map();
  private currentContext: ProjectContext | null = null;

  private constructor() {}

  /**
   * Get singleton instance of ProjectManager
   */
  public static getInstance(): ProjectManager {
    if (!ProjectManager.instance) {
      ProjectManager.instance = new ProjectManager();
    }
    return ProjectManager.instance;
  }

  /**
   * Get data directory path
   */
  private getDataDir(): string {
    return getDataDir();
  }

  /**
   * Get projects file path
   */
  private getProjectsFile(): string {
    return path.join(this.getDataDir(), PROJECTS_FILE_NAME);
  }

  /**
   * Get context file path
   */
  private getContextFile(): string {
    return path.join(this.getDataDir(), CONTEXT_FILE_NAMES.PROJECT_CONTEXT);
  }

  /**
   * Get project directory path
   */
  public getProjectPath(projectId: string): string {
    return path.join(this.getDataDir(), "projects", projectId);
  }

  /**
   * Initialize the project management system
   * Sets up directory structure
   */
  public async initialize(): Promise<void> {
    await this.ensureDataDir();
    await this.loadProjectsCache();
    await this.initializeContext();
  }

  /**
   * Ensure data directory structure exists
   */
  private async ensureDataDir(): Promise<void> {
    const dataDir = this.getDataDir();
    try {
      await fs.access(dataDir);
    } catch (error) {
      await fs.mkdir(dataDir, { recursive: true });
    }

    // Ensure projects.json exists
    const projectsFile = this.getProjectsFile();
    try {
      await fs.access(projectsFile);
    } catch (error) {
      await fs.writeFile(projectsFile, JSON.stringify({ projects: [] }, null, 2));
    }

    // Ensure memory directory exists for backups
    const memoryDir = path.join(dataDir, "memory");
    try {
      await fs.access(memoryDir);
    } catch (error) {
      await fs.mkdir(memoryDir, { recursive: true });
    }
  }


  /**
   * Load projects into cache for performance
   */
  private async loadProjectsCache(): Promise<void> {
    const projects = await this.readProjects();
    this.projectsCache.clear();
    
    for (const project of projects) {
      this.projectsCache.set(project.id, project);
    }
  }

  /**
   * Initialize project context
   */
  private async initializeContext(): Promise<void> {
    const contextFile = this.getContextFile();
    try {
      const contextData = await fs.readFile(contextFile, "utf-8");
      this.currentContext = JSON.parse(contextData);
      
      // Validate context data
      if (this.currentContext && this.currentContext.currentProjectId) {
        const projectExists = await this.projectExists(this.currentContext.currentProjectId);
        if (!projectExists) {
          // Clear context if current project doesn't exist - require explicit project
          this.currentContext.currentProjectId = null;
          this.currentContext.currentProject = null;
        }
        
        // Note: Plan context initialization should be handled separately
        // to avoid circular dependencies between projectModel and planModel
        this.currentContext.planContext = undefined;
      }
    } catch (error) {
      // Create initial context with no default project
      this.currentContext = {
        currentProjectId: null,
        currentProject: null,
        availableProjects: Array.from(this.projectsCache.values()),
        isMultiProject: false,
        dataDirectory: this.getDataDir(),
        planContext: undefined,
      };
    }
    
    await this.saveContext();
  }

  /**
   * Save current context to file
   */
  private async saveContext(): Promise<void> {
    if (this.currentContext) {
      this.currentContext.availableProjects = Array.from(this.projectsCache.values());
      const contextFile = this.getContextFile();
      await fs.writeFile(contextFile, JSON.stringify(this.currentContext, null, 2));
    }
  }

  /**
   * Read all projects from storage
   */
  private async readProjects(): Promise<ProjectMetadata[]> {
    try {
      const projectsFile = this.getProjectsFile();
      const data = await fs.readFile(projectsFile, "utf-8");
      const projects = JSON.parse(data).projects;

      // Convert date strings back to Date objects
      return projects.map((project: any) => ({
        ...project,
        createdAt: project.createdAt ? new Date(project.createdAt) : new Date(),
        updatedAt: project.updatedAt ? new Date(project.updatedAt) : new Date(),
        stats: project.stats ? {
          ...project.stats,
          lastActivity: project.stats.lastActivity ? new Date(project.stats.lastActivity) : new Date(),
        } : undefined,
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Write all projects to storage
   */
  private async writeProjects(projects: ProjectMetadata[]): Promise<void> {
    const projectsFile = this.getProjectsFile();
    await fs.writeFile(projectsFile, JSON.stringify({ projects }, null, 2));
    await this.loadProjectsCache(); // Refresh cache
  }

  /**
   * Create a new project
   */
  public async createProject(options: ProjectCreationOptions): Promise<ProjectOperationResult> {
    try {
      // Validate project name
      const validation = validateProjectName(options.name);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid project name: ${validation.errors.join(", ")}`,
        };
      }

      const sanitizedName = sanitizeProjectName(options.name);
      const projectId = uuidv4();

      // Check if sanitized name already exists
      const existingProjects = await this.readProjects();
      const nameExists = existingProjects.some(p => p.sanitizedName === sanitizedName);
      
      if (nameExists) {
        return {
          success: false,
          error: `A project with the name "${sanitizedName}" already exists`,
        };
      }

      // Create project metadata
      const projectMetadata: ProjectMetadata = {
        id: projectId,
        name: options.name,
        sanitizedName,
        description: options.description,
        status: ProjectStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: options.tags || [],
        config: {
          templateLanguage: process.env.TEMPLATES_USE || "en",
          autoBackup: true,
          ...options.config,
        },
        stats: {
          totalTasks: 0,
          completedTasks: 0,
          activeTasks: 0,
          lastActivity: new Date(),
        },
      };

      // Create project directory
      const projectPath = this.getProjectPath(projectId);
      await fs.mkdir(projectPath, { recursive: true });

      // Note: Plan initialization should be handled separately
      // to avoid circular dependencies

      // Handle copying from existing project or template
      if (options.copyFromProject) {
        await this.copyProjectData(options.copyFromProject, projectId);
      }

      // Save project metadata
      existingProjects.push(projectMetadata);
      await this.writeProjects(existingProjects);

      // Enable multi-project mode if this is the second project
      if (existingProjects.length > 1 && !this.currentContext?.isMultiProject) {
        if (this.currentContext) {
          this.currentContext.isMultiProject = true;
          await this.saveContext();
        }
      }

      return {
        success: true,
        data: projectMetadata,
        projectId,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create project: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Delete a project
   */
  public async deleteProject(projectId: string, confirm: boolean = false): Promise<ProjectOperationResult> {
    try {

      // Check if project exists
      const projectMetadata = await this.getProjectMetadata(projectId);
      if (!projectMetadata) {
        return {
          success: false,
          error: "Project not found",
        };
      }

      if (!confirm) {
        return {
          success: false,
          error: "Project deletion requires explicit confirmation",
        };
      }

      // Create backup before deletion
      const backupResult = await this.createProjectBackup(projectId, "manual", "Pre-deletion backup");
      
      // Remove project directory
      const projectPath = this.getProjectPath(projectId);
      await fs.rm(projectPath, { recursive: true, force: true });

      // Remove from projects list
      const projects = await this.readProjects();
      const filteredProjects = projects.filter(p => p.id !== projectId);
      await this.writeProjects(filteredProjects);

      // If this was the current project, clear context
      if (this.currentContext?.currentProjectId === projectId) {
        this.currentContext.currentProjectId = null;
        this.currentContext.currentProject = null;
        await this.saveContext();
      }

      return {
        success: true,
        data: { 
          deletedProject: projectMetadata,
          backup: backupResult.success ? backupResult.data : null 
        },
        projectId,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete project: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * List all projects with optional filtering
   */
  public async listProjects(options: ProjectQueryOptions = {}): Promise<ProjectMetadata[]> {
    let projects = await this.readProjects();

    // Apply filters
    if (options.status) {
      projects = projects.filter(p => p.status === options.status);
    }

    if (options.tags && options.tags.length > 0) {
      projects = projects.filter(p => 
        options.tags!.some(tag => p.tags?.includes(tag))
      );
    }

    if (options.namePattern) {
      const pattern = options.namePattern.toLowerCase();
      projects = projects.filter(p => 
        p.name.toLowerCase().includes(pattern) ||
        p.description?.toLowerCase().includes(pattern)
      );
    }

    // Apply sorting
    const sortBy = options.sortBy || 'updatedAt';
    const sortOrder = options.sortOrder || 'desc';
    
    projects.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'createdAt':
          aValue = a.createdAt.getTime();
          bValue = b.createdAt.getTime();
          break;
        case 'updatedAt':
          aValue = a.updatedAt.getTime();
          bValue = b.updatedAt.getTime();
          break;
        case 'lastActivity':
          aValue = a.stats?.lastActivity?.getTime() || 0;
          bValue = b.stats?.lastActivity?.getTime() || 0;
          break;
        default:
          aValue = a.updatedAt.getTime();
          bValue = b.updatedAt.getTime();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    // Apply pagination
    if (options.limit) {
      const offset = options.offset || 0;
      projects = projects.slice(offset, offset + options.limit);
    }

    return projects;
  }

  /**
   * Get project metadata by ID
   */
  public async getProjectMetadata(projectId: string): Promise<ProjectMetadata | null> {
    const cached = this.projectsCache.get(projectId);
    if (cached) {
      return cached;
    }

    const projects = await this.readProjects();
    return projects.find(p => p.id === projectId) || null;
  }

  /**
   * Check if project exists
   */
  public async projectExists(projectId: string): Promise<boolean> {
    try {
      const projectPath = this.getProjectPath(projectId);
      await fs.access(projectPath);
      
      const metadata = await this.getProjectMetadata(projectId);
      return metadata !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current project context
   */
  public async getCurrentContext(): Promise<ProjectContext | null> {
    if (this.currentContext && this.currentContext.currentProjectId) {
      // Note: Plan manager initialization should be handled separately
      // to avoid circular dependencies between projectModel and planModel
      // await planManager.initialize(this.currentContext.currentProjectId);
      // const planContext = planManager.getCurrentContext(this.currentContext.currentProjectId);
      // if (planContext) {
      //   this.currentContext.planContext = planContext;
      // }
    }
    return this.currentContext;
  }

  /**
   * Set current active project
   */
  public async setCurrentProject(projectId: string): Promise<ProjectOperationResult> {
    try {
      const projectExists = await this.projectExists(projectId);
      if (!projectExists) {
        return {
          success: false,
          error: "Project not found",
        };
      }

      const projectMetadata = await this.getProjectMetadata(projectId);
      
      if (this.currentContext) {
        this.currentContext.currentProjectId = projectId;
        this.currentContext.currentProject = projectMetadata;
        
        // Note: Plan context initialization should be handled separately
        // to avoid circular dependencies between projectModel and planModel
        // await planManager.initialize(projectId);
        // const planContext = planManager.getCurrentContext(projectId);
        // if (planContext) {
        //   this.currentContext.planContext = planContext;
        // }
        
        await this.saveContext();
      }

      return {
        success: true,
        data: projectMetadata,
        projectId,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to set current project: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Update project metadata
   */
  public async updateProject(projectId: string, updates: Partial<ProjectMetadata>): Promise<ProjectOperationResult> {
    try {
      const projects = await this.readProjects();
      const projectIndex = projects.findIndex(p => p.id === projectId);

      if (projectIndex === -1) {
        return {
          success: false,
          error: "Project not found",
        };
      }

      // Validate name change if provided
      if (updates.name && updates.name !== projects[projectIndex].name) {
        const validation = validateProjectName(updates.name);
        if (!validation.isValid) {
          return {
            success: false,
            error: `Invalid project name: ${validation.errors.join(", ")}`,
          };
        }

        const newSanitizedName = sanitizeProjectName(updates.name);
        const nameExists = projects.some(p => p.id !== projectId && p.sanitizedName === newSanitizedName);
        
        if (nameExists) {
          return {
            success: false,
            error: `A project with the name "${newSanitizedName}" already exists`,
          };
        }

        updates.sanitizedName = newSanitizedName;
      }

      // Update project
      projects[projectIndex] = {
        ...projects[projectIndex],
        ...updates,
        updatedAt: new Date(),
      };

      await this.writeProjects(projects);

      // Update context if this is the current project
      if (this.currentContext?.currentProjectId === projectId) {
        this.currentContext.currentProject = projects[projectIndex];
        await this.saveContext();
      }

      return {
        success: true,
        data: projects[projectIndex],
        projectId,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update project: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Create project backup
   */
  private async createProjectBackup(projectId: string, type: "manual" | "automatic" | "migration", description?: string): Promise<ProjectOperationResult> {
    try {
      const projectPath = this.getProjectPath(projectId);
      const projectMetadata = await this.getProjectMetadata(projectId);

      if (!projectMetadata) {
        return {
          success: false,
          error: "Project not found",
        };
      }

      // Read project data
      const tasksFile = path.join(projectPath, "tasks.json");
      const tasksData = await fs.readFile(tasksFile, "utf-8");

      const backupData = {
        project: projectMetadata,
        tasks: JSON.parse(tasksData),
        timestamp: new Date().toISOString(),
        type,
        description,
      };

      // Create backup file
      const timestamp = new Date().toISOString().replace(/:/g, "-").replace(/\..+/, "");
      const backupFileName = `project_${projectMetadata.sanitizedName}_${timestamp}.json`;
      const backupPath = path.join(this.getDataDir(), "memory", backupFileName);

      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));

      const backupInfo: ProjectBackup = {
        id: uuidv4(),
        projectId,
        createdAt: new Date(),
        filePath: backupPath,
        size: Buffer.byteLength(JSON.stringify(backupData), "utf-8"),
        type,
        description,
      };

      return {
        success: true,
        data: backupInfo,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create backup: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Copy data from one project to another
   */
  private async copyProjectData(sourceProjectId: string, targetProjectId: string): Promise<void> {
    const sourcePath = this.getProjectPath(sourceProjectId);
    const targetPath = this.getProjectPath(targetProjectId);

    const sourceTasksFile = path.join(sourcePath, "tasks.json");
    const targetTasksFile = path.join(targetPath, "tasks.json");

    try {
      await fs.copyFile(sourceTasksFile, targetTasksFile);
    } catch (error) {
      // If source doesn't exist, create empty tasks file
      await fs.writeFile(targetTasksFile, JSON.stringify({ tasks: [] }, null, 2));
    }
  }

  /**
   * Update project statistics
   */
  public async updateProjectStats(projectId: string, stats: Partial<ProjectStats>): Promise<void> {
    const projects = await this.readProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex !== -1) {
      projects[projectIndex].stats = {
        ...projects[projectIndex].stats!,
        ...stats,
        lastActivity: new Date(),
      };

      projects[projectIndex].updatedAt = new Date();
      await this.writeProjects(projects);
    }
  }


  /**
   * Check if system is in multi-project mode
   */
  public isMultiProjectMode(): boolean {
    return this.currentContext?.isMultiProject || false;
  }

  /**
   * Get projects directory path for a given project
   */
  public getProjectTasksFile(projectId: string): string {
    return path.join(this.getProjectPath(projectId), "tasks.json");
  }
}

// Export singleton instance
export const projectManager = ProjectManager.getInstance();

// Export helper functions
export async function getCurrentProjectId(): Promise<string | null> {
  const context = await projectManager.getCurrentContext();
  return context?.currentProjectId || null;
}

export async function getCurrentProjectPath(): Promise<string | null> {
  const projectId = await getCurrentProjectId();
  if (!projectId) return null;
  return projectManager.getProjectPath(projectId);
}

export function getProjectTasksFilePath(projectId: string): string {
  if (!projectId) {
    throw new Error("Project ID is required");
  }
  return projectManager.getProjectTasksFile(projectId);
}
