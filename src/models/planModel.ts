/**
 * Plan Management Model
 * 
 * Handles plan lifecycle operations including creation, deletion, listing,
 * and metadata management within project directories.
 */

import {
  PlanMetadata,
  PlanStatus,
  PlanContext,
  PlanStats,
  PlanCreationOptions,
  PlanOperationResult,
} from "../types/index.js";
import { sanitizeProjectName, validateProjectName, getDataDir } from "../utils/index.js";
import { 
  PLANS_DIR_NAME,
  CONTEXT_FILE_NAMES,
  BACKUP_CONFIG
} from "../utils/constants.js";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

/**
 * PlanManager Class
 * 
 * Core class for managing plans within projects in the MCP Shrimp Task Manager Enhanced system.
 * Provides complete plan lifecycle management with backwards compatibility.
 */
export class PlanManager {
  private static instance: PlanManager;
  private plansCache: Map<string, Map<string, PlanMetadata>> = new Map(); // projectId -> planId -> PlanMetadata
  private currentPlanContext: Map<string, PlanContext> = new Map(); // projectId -> PlanContext

  private constructor() {}

  /**
   * Get singleton instance of PlanManager
   */
  public static getInstance(): PlanManager {
    if (!PlanManager.instance) {
      PlanManager.instance = new PlanManager();
    }
    return PlanManager.instance;
  }

  /**
   * Get project path - replaces dependency on projectManager
   */
  private getProjectPath(projectId: string): string {
    const dataDir = getDataDir();
    return path.join(dataDir, "projects", projectId);
  }

  /**
   * Get current project ID from context
   * @deprecated This method should not be used - projectId must be provided explicitly
   */
  private async getCurrentProjectId(): Promise<string | null> {
    // This method is deprecated - projectId should always be provided explicitly
    // Reading from project context is not reliable without explicit project specification
    return null;
  }

  /**
   * Initialize the plan management system for a project
   * Sets up directory structure
   */
  public async initialize(projectId?: string): Promise<void> {
    const targetProjectId = projectId || await this.getCurrentProjectId();
    if (!targetProjectId) {
      throw new Error("Project ID is required for plan initialization");
    }
    await this.ensurePlanDir(targetProjectId);
    await this.loadPlansCache(targetProjectId);
    await this.initializeContext(targetProjectId);
  }

  /**
   * Ensure plan directory structure exists for a project
   */
  private async ensurePlanDir(projectId: string): Promise<void> {
    const projectPath = this.getProjectPath(projectId);
    const plansFile = this.getPlansFilePath(projectId);
    
    try {
      await fs.access(plansFile);
    } catch (error) {
      // Create plans.json if it doesn't exist
      await fs.writeFile(plansFile, JSON.stringify({ plans: [] }, null, 2));
    }
  }


  /**
   * Calculate statistics for a plan based on its tasks
   */
  private async calculatePlanStats(projectId: string, planId: string): Promise<PlanStats> {
    try {
      const tasksFile = this.getPlanTasksFilePath(projectId, planId);
      const tasksData = await fs.readFile(tasksFile, "utf-8");
      const { tasks } = JSON.parse(tasksData);
      
      let totalTasks = 0;
      let completedTasks = 0;
      let activeTasks = 0;
      let pendingTasks = 0;
      let blockedTasks = 0;
      let lastActivity = new Date(0); // Start with epoch
      
      if (tasks && Array.isArray(tasks)) {
        totalTasks = tasks.length;
        
        tasks.forEach((task: any) => {
          switch (task.status) {
            case 'completed':
              completedTasks++;
              break;
            case 'in_progress':
              activeTasks++;
              break;
            case 'pending':
              pendingTasks++;
              break;
            case 'blocked':
              blockedTasks++;
              break;
          }
          
          // Track most recent activity
          const taskUpdated = new Date(task.updatedAt || task.createdAt);
          if (taskUpdated > lastActivity) {
            lastActivity = taskUpdated;
          }
        });
      }
      
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      return {
        totalTasks,
        completedTasks,
        activeTasks,
        pendingTasks,
        blockedTasks,
        completionRate,
        lastActivity: lastActivity.getTime() === 0 ? new Date() : lastActivity,
      };
    } catch (error) {
      // Return default stats if calculation fails
      return {
        totalTasks: 0,
        completedTasks: 0,
        activeTasks: 0,
        pendingTasks: 0,
        blockedTasks: 0,
        completionRate: 0,
        lastActivity: new Date(),
      };
    }
  }

  /**
   * Load plans into cache for performance
   */
  private async loadPlansCache(projectId: string): Promise<void> {
    const plans = await this.readPlans(projectId);
    
    if (!this.plansCache.has(projectId)) {
      this.plansCache.set(projectId, new Map());
    }
    
    const projectPlansCache = this.plansCache.get(projectId)!;
    projectPlansCache.clear();
    
    for (const plan of plans) {
      projectPlansCache.set(plan.id, plan);
    }
  }

  /**
   * Initialize plan context for a project
   */
  private async initializeContext(projectId: string): Promise<void> {
    const contextFile = this.getContextFilePath(projectId);
    
    try {
      const contextData = await fs.readFile(contextFile, "utf-8");
      const context: PlanContext = JSON.parse(contextData);
      
      // Validate context data
      if (context && context.currentPlanId) {
        const planExists = await this.planExists(projectId, context.currentPlanId);
        if (!planExists) {
          // Clear context if current plan doesn't exist - require explicit plan
          context.currentPlanId = null;
          context.currentPlan = null;
        }
      }
      
      this.currentPlanContext.set(projectId, context);
    } catch (error) {
      // Create initial context with no default plan
      const projectPlansCache = this.plansCache.get(projectId) || new Map();
      
      const context: PlanContext = {
        currentPlanId: null,
        currentPlan: null,
        availablePlans: Array.from(projectPlansCache.values()),
        planDirectory: null,
      };
      
      this.currentPlanContext.set(projectId, context);
    }
    
    await this.saveContext(projectId);
  }

  /**
   * Save current context to file
   */
  private async saveContext(projectId: string): Promise<void> {
    const context = this.currentPlanContext.get(projectId);
    if (context) {
      const projectPlansCache = this.plansCache.get(projectId) || new Map();
      context.availablePlans = Array.from(projectPlansCache.values());
      const contextFile = this.getContextFilePath(projectId);
      await fs.writeFile(contextFile, JSON.stringify(context, null, 2));
    }
  }

  /**
   * Read all plans from storage for a project
   */
  private async readPlans(projectId: string): Promise<PlanMetadata[]> {
    try {
      const plansFile = this.getPlansFilePath(projectId);
      const data = await fs.readFile(plansFile, "utf-8");
      const plans = JSON.parse(data).plans;

      // Convert date strings back to Date objects
      return plans.map((plan: any) => ({
        ...plan,
        createdAt: plan.createdAt ? new Date(plan.createdAt) : new Date(),
        updatedAt: plan.updatedAt ? new Date(plan.updatedAt) : new Date(),
        stats: plan.stats ? {
          ...plan.stats,
          lastActivity: plan.stats.lastActivity ? new Date(plan.stats.lastActivity) : new Date(),
        } : undefined,
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Write all plans to storage for a project
   */
  private async writePlans(projectId: string, plans: PlanMetadata[]): Promise<void> {
    const plansFile = this.getPlansFilePath(projectId);
    await fs.writeFile(plansFile, JSON.stringify({ plans }, null, 2));
    await this.loadPlansCache(projectId); // Refresh cache
  }

  /**
   * Get plans file path for a project
   */
  private getPlansFilePath(projectId: string): string {
    const projectPath = this.getProjectPath(projectId);
    return path.join(projectPath, "plans.json");
  }

  /**
   * Get plan context file path for a project
   */
  private getContextFilePath(projectId: string): string {
    const projectPath = this.getProjectPath(projectId);
    return path.join(projectPath, CONTEXT_FILE_NAMES.PLAN_CONTEXT);
  }

  /**
   * Get plan directory path
   */
  public getPlanPath(projectId: string, planId: string): string {
    const projectPath = this.getProjectPath(projectId);
    const sanitizedPlanName = planId;
    return path.join(projectPath, PLANS_DIR_NAME, sanitizedPlanName);
  }

  /**
   * Get plan tasks file path
   */
  public getPlanTasksFilePath(projectId: string, planId: string): string {
    const planPath = this.getPlanPath(projectId, planId);
    return path.join(planPath, "tasks.json");
  }

  /**
   * Check if plan exists
   */
  public async planExists(projectId: string, planId: string): Promise<boolean> {
    try {
      const planPath = this.getPlanPath(projectId, planId);
      await fs.access(planPath);
      
      const metadata = await this.getPlanMetadata(projectId, planId);
      return metadata !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get plan metadata by ID
   */
  public async getPlanMetadata(projectId: string, planId: string): Promise<PlanMetadata | null> {
    const projectPlansCache = this.plansCache.get(projectId);
    if (projectPlansCache) {
      const cached = projectPlansCache.get(planId);
      if (cached) {
        return cached;
      }
    }

    const plans = await this.readPlans(projectId);
    return plans.find(p => p.id === planId) || null;
  }

  /**
   * Get current plan context for a project
   */
  public getCurrentContext(projectId?: string): PlanContext | null {
    if (!projectId) {
      throw new Error("Project ID is required");
    }
    const targetProjectId = projectId;
    return this.currentPlanContext.get(targetProjectId) || null;
  }

  /**
   * Get current plan metadata for a project
   */
  public async getCurrentPlan(projectId: string): Promise<PlanMetadata | null> {
    const context = this.getCurrentContext(projectId);
    return context?.currentPlan || null;
  }

  /**
   * Create a new plan
   */
  public async createPlan(projectId: string, options: PlanCreationOptions): Promise<PlanOperationResult> {
    try {
      // Validate plan name
      const validation = validateProjectName(options.name);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid plan name: ${validation.errors.join(", ")}`,
        };
      }

      const sanitizedName = sanitizeProjectName(options.name);
      const planId = uuidv4();

      // Check if sanitized name already exists
      const existingPlans = await this.readPlans(projectId);
      const nameExists = existingPlans.some(p => p.sanitizedName === sanitizedName);
      
      if (nameExists) {
        return {
          success: false,
          error: `A plan with the name "${sanitizedName}" already exists in this project`,
        };
      }

      // Create plan metadata
      const planMetadata: PlanMetadata = {
        id: planId,
        name: options.name,
        sanitizedName,
        description: options.description,
        status: PlanStatus.ACTIVE,
        projectId,
        parentPlanId: options.parentPlanId,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: options.tags || [],
        stats: {
          totalTasks: 0,
          completedTasks: 0,
          activeTasks: 0,
          pendingTasks: 0,
          blockedTasks: 0,
          completionRate: 0,
          lastActivity: new Date(),
        },
      };

      // Create plan directory
      const planPath = this.getPlanPath(projectId, planId);
      await fs.mkdir(planPath, { recursive: true });

      // Create initial tasks.json file
      const tasksFile = this.getPlanTasksFilePath(projectId, planId);
      await fs.writeFile(tasksFile, JSON.stringify({ tasks: [] }, null, 2));

      // Handle copying from existing plan
      if (options.copyFromPlan) {
        await this.copyPlanData(projectId, options.copyFromPlan, planId);
      }

      // Save plan metadata
      existingPlans.push(planMetadata);
      await this.writePlans(projectId, existingPlans);

      // Update context after creating new plan
      if (existingPlans.length === 1) { // This is the first plan
        const context = this.currentPlanContext.get(projectId);
        if (context) {
          context.availablePlans = existingPlans;
          await this.saveContext(projectId);
        }
      }

      return {
        success: true,
        data: planMetadata,
        planId,
        projectId,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create plan: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * List plans with optional filtering and sorting
   */
  public async listPlans(projectId: string, options: { 
    status?: PlanStatus; 
    tags?: string[]; 
    sortBy?: 'name' | 'createdAt' | 'updatedAt'; 
    sortOrder?: 'asc' | 'desc' 
  } = {}): Promise<PlanMetadata[]> {
    let plans = await this.readPlans(projectId);

    // Apply filters
    if (options.status) {
      plans = plans.filter(p => p.status === options.status);
    }

    if (options.tags && options.tags.length > 0) {
      plans = plans.filter(p => 
        options.tags!.some(tag => p.tags?.includes(tag))
      );
    }

    // Apply sorting
    const sortBy = options.sortBy || 'updatedAt';
    const sortOrder = options.sortOrder || 'desc';
    
    plans.sort((a, b) => {
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

    return plans;
  }

  /**
   * Update plan metadata
   */
  public async updatePlan(projectId: string, planId: string, updates: Partial<PlanMetadata>): Promise<PlanOperationResult> {
    try {
      const plans = await this.readPlans(projectId);
      const planIndex = plans.findIndex(p => p.id === planId);

      if (planIndex === -1) {
        return {
          success: false,
          error: "Plan not found",
        };
      }

      // Validate name change if provided
      if (updates.name && updates.name !== plans[planIndex].name) {
        const validation = validateProjectName(updates.name);
        if (!validation.isValid) {
          return {
            success: false,
            error: `Invalid plan name: ${validation.errors.join(", ")}`,
          };
        }

        const newSanitizedName = sanitizeProjectName(updates.name);
        const nameExists = plans.some(p => p.id !== planId && p.sanitizedName === newSanitizedName);
        
        if (nameExists) {
          return {
            success: false,
            error: `A plan with the name "${newSanitizedName}" already exists`,
          };
        }

        updates.sanitizedName = newSanitizedName;
      }

      // Update plan
      plans[planIndex] = {
        ...plans[planIndex],
        ...updates,
        updatedAt: new Date(),
      };

      await this.writePlans(projectId, plans);

      // Update context if this is the current plan
      const context = this.currentPlanContext.get(projectId);
      if (context?.currentPlanId === planId) {
        context.currentPlan = plans[planIndex];
        await this.saveContext(projectId);
      }

      return {
        success: true,
        data: plans[planIndex],
        planId,
        projectId,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update plan: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Delete a plan
   */
  public async deletePlan(projectId: string, planId: string, confirm: boolean = false): Promise<PlanOperationResult> {
    try {
      // Check if plan exists
      const planMetadata = await this.getPlanMetadata(projectId, planId);
      if (!planMetadata) {
        return {
          success: false,
          error: "Plan not found",
        };
      }

      // Check if this is the only plan
      const plans = await this.readPlans(projectId);
      if (plans.length <= 1) {
        return {
          success: false,
          error: "Cannot delete the only plan in the project",
        };
      }

      if (!confirm) {
        return {
          success: false,
          error: "Plan deletion requires explicit confirmation",
        };
      }

      // Create backup before deletion
      const backupResult = await this.createPlanBackup(projectId, planId, "Pre-deletion backup");
      
      // Remove plan directory
      const planPath = this.getPlanPath(projectId, planId);
      await fs.rm(planPath, { recursive: true, force: true });

      // Remove from plans list
      const filteredPlans = plans.filter(p => p.id !== planId);
      await this.writePlans(projectId, filteredPlans);

      // If this was the current plan, clear context
      const context = this.currentPlanContext.get(projectId);
      if (context?.currentPlanId === planId) {
        context.currentPlanId = null;
        context.currentPlan = null;
        await this.saveContext(projectId);
      } else if (context) {
        // Update available plans in context
        context.availablePlans = filteredPlans;
        await this.saveContext(projectId);
      }

      return {
        success: true,
        data: { 
          deletedPlan: planMetadata,
          backup: backupResult.success ? backupResult.data : null 
        },
        planId,
        projectId,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete plan: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Switch to a different plan (alias for setCurrentPlan with better semantics)
   */
  public async switchPlan(projectId: string, planId: string): Promise<PlanOperationResult> {
    return await this.setCurrentPlan(projectId, planId);
  }

  /**
   * Set current active plan for a project
   */
  public async setCurrentPlan(projectId: string, planId: string): Promise<PlanOperationResult> {
    try {
      const planExists = await this.planExists(projectId, planId);
      if (!planExists) {
        return {
          success: false,
          error: "Plan not found",
        };
      }

      const planMetadata = await this.getPlanMetadata(projectId, planId);
      
      const context = this.currentPlanContext.get(projectId) || {
        currentPlanId: planId,
        currentPlan: planMetadata!,
        availablePlans: await this.readPlans(projectId),
        planDirectory: this.getPlanPath(projectId, planId),
      };

      context.currentPlanId = planId;
      context.currentPlan = planMetadata!;
      context.planDirectory = this.getPlanPath(projectId, planId);
      
      this.currentPlanContext.set(projectId, context);
      await this.saveContext(projectId);

      return {
        success: true,
        data: planMetadata,
        planId,
        projectId,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to set current plan: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Create plan backup
   */
  private async createPlanBackup(projectId: string, planId: string, description?: string): Promise<PlanOperationResult> {
    try {
      const planPath = this.getPlanPath(projectId, planId);
      const planMetadata = await this.getPlanMetadata(projectId, planId);

      if (!planMetadata) {
        return {
          success: false,
          error: "Plan not found",
        };
      }

      // Read plan data
      const tasksFile = this.getPlanTasksFilePath(projectId, planId);
      const tasksData = await fs.readFile(tasksFile, "utf-8");

      const backupData = {
        plan: planMetadata,
        tasks: JSON.parse(tasksData),
        timestamp: new Date().toISOString(),
        description,
      };

      // Create backup file
      const projectPath = this.getProjectPath(projectId);
      const timestamp = new Date().toISOString().replace(/:/g, "-").replace(/\..+/, "");
      const backupFileName = `plan_${planMetadata.sanitizedName}_${timestamp}.json`;
      const backupPath = path.join(projectPath, BACKUP_CONFIG.DIRECTORY, backupFileName);

      // Ensure backup directory exists
      await fs.mkdir(path.dirname(backupPath), { recursive: true });
      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));

      return {
        success: true,
        data: {
          backupPath,
          size: Buffer.byteLength(JSON.stringify(backupData), "utf-8"),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create backup: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Copy data from one plan to another
   */
  private async copyPlanData(projectId: string, sourcePlanId: string, targetPlanId: string): Promise<void> {
    const sourceTasksFile = this.getPlanTasksFilePath(projectId, sourcePlanId);
    const targetTasksFile = this.getPlanTasksFilePath(projectId, targetPlanId);

    try {
      await fs.copyFile(sourceTasksFile, targetTasksFile);
    } catch (error) {
      // If source doesn't exist, create empty tasks file
      await fs.writeFile(targetTasksFile, JSON.stringify({ tasks: [] }, null, 2));
    }
  }

  /**
   * Update plan statistics based on current tasks
   * This should be called after any task operation that affects task counts or status
   */
  public async updatePlanStats(projectId: string, planId: string): Promise<void> {
    try {
      const stats = await this.calculatePlanStats(projectId, planId);
      const plans = await this.readPlans(projectId);
      const planIndex = plans.findIndex(p => p.id === planId);
      
      if (planIndex !== -1) {
        plans[planIndex].stats = stats;
        plans[planIndex].updatedAt = new Date();
        await this.writePlans(projectId, plans);
        
        // Update cache
        const projectPlansCache = this.plansCache.get(projectId);
        if (projectPlansCache) {
          projectPlansCache.set(planId, plans[planIndex]);
        }
        
        // Update context if this is the current plan
        const context = this.currentPlanContext.get(projectId);
        if (context?.currentPlanId === planId) {
          context.currentPlan = plans[planIndex];
          await this.saveContext(projectId);
        }
      }
    } catch (error) {
      // Log error but don't throw - stats update is non-critical
      console.error(`Failed to update plan stats: ${error}`);
    }
  }

  /**
   * Get plan statistics with caching
   * Returns cached stats if available and recent, otherwise recalculates
   */
  public async getPlanStats(projectId: string, planId: string, forceRefresh: boolean = false): Promise<PlanStats | null> {
    try {
      const planMetadata = await this.getPlanMetadata(projectId, planId);
      
      if (!planMetadata) {
        return null;
      }
      
      // Check if cached stats are recent (within 5 minutes)
      const statAge = planMetadata.stats?.lastActivity 
        ? Date.now() - new Date(planMetadata.stats.lastActivity).getTime()
        : Infinity;
      
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
      
      if (!forceRefresh && planMetadata.stats && statAge < CACHE_DURATION) {
        return planMetadata.stats;
      }
      
      // Recalculate stats
      const stats = await this.calculatePlanStats(projectId, planId);
      await this.updatePlanStats(projectId, planId);
      
      return stats;
    } catch (error) {
      return null;
    }
  }
}

// Export singleton instance
export const planManager = PlanManager.getInstance();

// Export helper functions for convenience
export async function getCurrentPlanId(projectId: string): Promise<string | null> {
  if (!projectId) {
    throw new Error("Project ID is required");
  }
  const context = planManager.getCurrentContext(projectId);
  return context?.currentPlanId || null;
}

export async function getCurrentPlanPath(projectId: string): Promise<string | null> {
  if (!projectId) {
    throw new Error("Project ID is required");
  }
  const planId = await getCurrentPlanId(projectId);
  if (!planId) return null;
  return planManager.getPlanPath(projectId, planId);
}

export function getPlanTasksFilePath(projectId: string, planId: string): string {
  if (!projectId || !planId) {
    throw new Error("Project ID and Plan ID are required");
  }
  return planManager.getPlanTasksFilePath(projectId, planId);
}
