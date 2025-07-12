import express, { Request, Response, NextFunction, RequestHandler } from "express";
import getPort from "get-port";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";

// Import types
import type {
  SseUpdateOptions,
  SseUpdateMessage,
  ApiTaskUpdateRequest,
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiProjectsResponse,
  ApiPlansResponse,
  ApiTasksResponse,
  ProjectQueryParams,
  SetActivePlanRequest,
} from "../types/mcp.js";

// Import path utilities
import { getDataDir, getPublicPath, getTasksFilePath, getWebGuiFilePath } from "../utils/paths.js";

// Import application constants
import {
  ENV_KEYS,
  GUI_CONFIG,
  PROCESS_SIGNALS,
} from "../utils/constants.js";

// Import SSE utilities
import {
  sseManager,
  createSseNotifier,
  sseEndpointHandler,
  notifyProjectUpdate,
  notifyTaskUpdate,
  notifyPlanUpdate
} from "../utils/sse.js";

// Import tools for API endpoints
import { 
  listProjects,
  listPlans,
  switchPlan,
  updateTaskContent
} from "../tools/index.js";

// Import project and task models for API endpoints
import { projectManager } from "../models/projectModel.js";
import { loadProjectTasks, setSseNotifier } from "../models/taskModel.js";

/**
 * Configure and create Express application with all routes and middleware
 */
export function createExpressApp(): express.Application {
  const app = express();

  // Connect the SSE notification system to the task model
  setSseNotifier(createSseNotifier());

  // Set up static files directory
  const publicPath = getPublicPath();
  const DATA_DIR = getDataDir();
  const TASKS_FILE_PATH = getTasksFilePath();

  app.use(express.static(publicPath));
  app.use(express.json()); // Add JSON body parser

  // Set up API routes
  
  // New API endpoint for listing projects
  app.get("/api/projects", async (req, res: Response<ApiProjectsResponse | ApiErrorResponse>) => {
    try {
      // Initialize project manager if needed
      await projectManager.initialize();
      
      // Use the existing listProjects tool function
      const result = await listProjects({
        status: 'all',
        includeStats: true,
        sortBy: 'updatedAt',
        sortOrder: 'desc'
      });
      
      // Extract projects data from MCP response format
      const content = result.content[0];
      if (content && content.type === "text") {
        // Parse the structured response to extract projects data
        const responseText = content.text;
        
        // For now, get projects directly from projectManager
        const projects = await projectManager.listProjects();
        
        res.json({ projects });
      } else {
        res.status(500).json({ error: "Invalid response format from listProjects" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to list projects" });
    }
  });
  
  // New API endpoint for listing plans
  app.get("/api/plans", async (req: Request<{}, {}, {}, ProjectQueryParams>, res: Response<ApiPlansResponse | ApiErrorResponse>) => {
    try {
      const projectParam = req.query.project as string;
      
      if (!projectParam) {
        res.status(400).json({ error: "Project parameter is required" });
        return;
      }
      
      // Initialize project manager
      await projectManager.initialize();
      
      // Validate project exists
      const projectExists = await projectManager.projectExists(projectParam);
      if (!projectExists) {
        res.status(404).json({ error: `Project '${projectParam}' not found` });
        return;
      }
      
      // Use the existing listPlans tool function
      const result = await listPlans({
        projectName: projectParam,
        status: 'all',
        includeStats: true,
        sortBy: 'updatedAt',
        sortOrder: 'desc'
      });
      
      // Extract plans data from MCP response format
      const content = result.content[0];
      if (content && content.type === "text") {
        // The listPlans function returns formatted text, but we need the raw data
        // Let's get plans directly from planManager for the API
        const { planManager } = await import("../models/planModel.js");
        await planManager.initialize(projectParam);
        const plans = await planManager.listPlans(projectParam, {
          sortBy: 'updatedAt',
          sortOrder: 'desc'
        });
        
        // Get the current plan context to mark which plan is active
        const context = planManager.getCurrentContext(projectParam);
        const currentPlanId = context?.currentPlanId || 'default';
        
        // Add the 'current' flag to the active plan
        const plansWithCurrent = plans.map(plan => ({
          ...plan,
          current: plan.id === currentPlanId
        }));
        
        res.json({ plans: plansWithCurrent });
      } else {
        res.status(500).json({ error: "Invalid response format from listPlans" });
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ error: "Failed to list plans" });
    }
  });
  
  // New API endpoint for deleting plans
  app.delete("/api/plans/delete", async (req: Request<{}, {}, { projectName: string; planName: string; confirm?: boolean }>, res: Response<ApiSuccessResponse | ApiErrorResponse>) => {
    try {
      const { projectName, planName, confirm } = req.body;
      
      // Validate required parameters
      if (!projectName || !planName) {
        res.status(400).json({ 
          error: "Missing required parameters: projectName and planName are required" 
        });
        return;
      }
      
      // Validate input types
      if (typeof projectName !== 'string' || typeof planName !== 'string') {
        res.status(400).json({ 
          error: "Invalid parameter types: projectName and planName must be strings" 
        });
        return;
      }
      
      // Initialize project manager
      await projectManager.initialize();
      
      // Validate project exists
      const projectExists = await projectManager.projectExists(projectName);
      if (!projectExists) {
        res.status(404).json({ 
          error: `Project '${projectName}' not found` 
        });
        return;
      }
      
      // Validate plan exists in the project
      const { planManager } = await import("../models/planModel.js");
      await planManager.initialize(projectName);
      const planExists = await planManager.planExists(projectName, planName);
      if (!planExists) {
        res.status(404).json({ 
          error: `Plan '${planName}' not found in project '${projectName}'` 
        });
        return;
      }
      
      // Call the existing deletePlan tool function
      const { deletePlan } = await import("../tools/index.js");
      const result = await deletePlan({
        projectName,
        planName,
        confirm: confirm || false
      });
      
      // Check if the deletePlan was successful
      const content = result.content[0];
      if (content && content.type === "text") {
        const responseText = content.text;
        
        // Check for error indicators in the response
        if (responseText.includes('Error') || responseText.includes('Failed')) {
          res.status(500).json({ 
            error: "Failed to delete plan", 
            details: responseText 
          });
          return;
        }
        
        // Check if confirmation is required
        if (responseText.includes('confirm') && !confirm) {
          res.status(400).json({ 
            error: "Confirmation required", 
            requiresConfirmation: true,
            message: responseText
          });
          return;
        }
        
        // Send SSE update to notify all clients of the plan deletion
        notifyPlanUpdate(projectName, 'deleted', { 
          deletedPlan: planName,
          message: `Plan '${planName}' has been deleted`
        });
        
        res.json({ 
          success: true, 
          message: `Successfully deleted plan '${planName}' from project '${projectName}'`,
          projectName,
          planName,
          result: responseText
        });
      } else {
        res.status(500).json({ 
          error: "Invalid response format from deletePlan tool" 
        });
      }
      
    } catch (error) {
      console.error("Error deleting plan:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        error: "Internal server error while deleting plan",
        details: errorMessage
      });
    }
  });
  
  // New API endpoint for setting active plan
  app.post("/api/plans/set-active", async (req: Request<{}, {}, SetActivePlanRequest>, res: Response<ApiSuccessResponse | ApiErrorResponse>) => {
    try {
      const { projectName, planName } = req.body;
      
      // Validate required parameters
      if (!projectName || !planName) {
        res.status(400).json({ 
          error: "Missing required parameters: projectName and planName are required" 
        });
        return;
      }
      
      // Validate input types
      if (typeof projectName !== 'string' || typeof planName !== 'string') {
        res.status(400).json({ 
          error: "Invalid parameter types: projectName and planName must be strings" 
        });
        return;
      }
      
      // Initialize project manager
      await projectManager.initialize();
      
      // Validate project exists
      const projectExists = await projectManager.projectExists(projectName);
      if (!projectExists) {
        res.status(404).json({ 
          error: `Project '${projectName}' not found` 
        });
        return;
      }
      
      // Validate plan exists in the project
      const { planManager } = await import("../models/planModel.js");
      await planManager.initialize(projectName);
      const planExists = await planManager.planExists(projectName, planName);
      if (!planExists) {
        res.status(404).json({ 
          error: `Plan '${planName}' not found in project '${projectName}'` 
        });
        return;
      }
      
      // Call the existing switchPlan tool function
      const result = await switchPlan({
        projectName,
        planName
      });
      
      // Check if the switchPlan was successful
      const content = result.content[0];
      if (content && content.type === "text") {
        const responseText = content.text;
        
        // Check for error indicators in the response
        if (responseText.includes('Error') || responseText.includes('Failed')) {
          res.status(500).json({ 
            error: "Failed to switch plan", 
            details: responseText 
          });
          return;
        }
        
        // Send SSE update to notify all clients of the plan change
        notifyPlanUpdate(projectName, 'updated', { 
          newActivePlan: planName,
          message: 'Active plan changed'
        });
        
        res.json({ 
          success: true, 
          message: `Successfully set '${planName}' as active plan in project '${projectName}'`,
          projectName,
          planName,
          result: responseText
        });
      } else {
        res.status(500).json({ 
          error: "Invalid response format from switchPlan tool" 
        });
      }
      
    } catch (error) {
      console.error("Error setting active plan:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        error: "Internal server error while setting active plan",
        details: errorMessage
      });
    }
  });
  
  // Modified API endpoint for tasks - now supports project and plan parameters
  app.get("/api/tasks", async (req: Request<{}, {}, {}, ProjectQueryParams>, res: Response<ApiTasksResponse | ApiErrorResponse>) => {
    try {
      const projectParam = req.query.project as string;
      const planParam = req.query.plan as string;
      
      if (projectParam) {
        // Project-specific task loading (with optional plan filtering)
        try {
          // Initialize project manager
          await projectManager.initialize();
          
          // Validate project exists
          const projectExists = await projectManager.projectExists(projectParam);
          if (!projectExists) {
            res.status(404).json({ error: `Project '${projectParam}' not found` });
            return;
          }
          
          // If plan parameter is provided, validate it exists
          if (planParam) {
            const { planManager } = await import("../models/planModel.js");
            await planManager.initialize(projectParam);
            const planExists = await planManager.planExists(projectParam, planParam);
            if (!planExists) {
              res.status(404).json({ error: `Plan '${planParam}' not found in project '${projectParam}'` });
              return;
            }
          }
          
          // Load tasks for the specified project and plan
          const tasks = await loadProjectTasks(projectParam, planParam || 'default');
          res.json({ tasks });
        } catch (projectError) {
          console.error("Error loading project tasks:", projectError);
          res.status(500).json({ error: "Failed to load project tasks" });
        }
      } else {
        // Backwards compatibility: use default project or legacy tasks.json
        try {
          // Try to load from default project first
          await projectManager.initialize();
          const tasks = await loadProjectTasks('default', planParam || 'default');
          res.json({ tasks });
        } catch (defaultProjectError) {
          // Fall back to legacy tasks.json for backwards compatibility
          try {
            const tasksData = await fsPromises.readFile(TASKS_FILE_PATH, "utf-8");
            res.json(JSON.parse(tasksData));
          } catch (legacyError) {
            // Ensure file doesn't exist returns empty task list
            if ((legacyError as NodeJS.ErrnoException).code === "ENOENT") {
              res.json({ tasks: [] });
            } else {
              res.status(500).json({ error: "Failed to read tasks data" });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error retrieving tasks:", error);
      res.status(500).json({ error: "Failed to retrieve tasks" });
    }
  });

  // Add: SSE endpoint
  app.get("/api/tasks/stream", sseEndpointHandler);

  // Add: Update task endpoint
  const updateHandler: RequestHandler<{}, ApiSuccessResponse | ApiErrorResponse, ApiTaskUpdateRequest> = async (req, res) => {
    try {
      const { taskId, updates } = req.body;
      
      if (!taskId || !updates) {
        res.status(400).json({ error: "Missing taskId or updates" });
        return;
      }

      // Extract project and plan information
      const projectName = updates.projectName || 'default';
      const planName = updates.planName || 'default';

      // Call the updateTaskContent function with plan awareness
      const result = await updateTaskContent({
        taskId,
        implementationGuide: updates.implementationGuide,
        projectName: projectName,
        // Note: planName parameter is not supported in the current tool schema
        // but the tool will use the current plan context through projectName
      });

      // Send SSE update to notify clients with project and plan context
      notifyTaskUpdate(projectName, planName, 'updated');
      
      res.json({ success: true, result });
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  };
  
  app.post("/api/tasks/update", updateHandler);

  return app;
}

/**
 * Start the Express server on specified port
 */
export async function startExpressServer(app: express.Application): Promise<{ httpServer: any, port: string | number }> {
  // Get available port
  const port = process.env[ENV_KEYS.WEB_PORT] || (await getPort());

  // Start HTTP server
  const httpServer = app.listen(port, () => {
    // Note: File watching removed - SSE updates now handled directly by task model
    // The old file watcher was watching the legacy tasks.json file, but tasks are now
    // stored in project-specific files and SSE notifications are sent directly
    // from the saveProjectTasks function in taskModel.ts
  });

  // Write URL to WebGUI.md
  try {
    // Read TEMPLATES_USE environment variable and convert to language code
    const templatesUse = process.env[ENV_KEYS.TEMPLATES_USE] || GUI_CONFIG.DEFAULT_LANGUAGE;
    const getLanguageFromTemplate = (template: string): string => {
      return GUI_CONFIG.LANGUAGE_MAPPING[template as keyof typeof GUI_CONFIG.LANGUAGE_MAPPING] || GUI_CONFIG.DEFAULT_LANGUAGE;
    };
    const language = getLanguageFromTemplate(templatesUse);

    const websiteUrl = `[Task Manager UI](http://localhost:${port}?lang=${language})`;
    const websiteFilePath = getWebGuiFilePath();
    await fsPromises.writeFile(websiteFilePath, websiteUrl, "utf-8");
  } catch (error) {
    // Silently handle WebGUI.md write errors
  }

  return { httpServer, port };
}

/**
 * Set up graceful shutdown handlers for the Express server
 */
export function setupShutdownHandlers(httpServer: any): void {
  const shutdownHandler = async () => {
    // Close all SSE connections
    sseManager.shutdown();

    // Close HTTP server
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    process.exit(0);
  };

  process.on(PROCESS_SIGNALS.SIGINT, shutdownHandler);
  process.on(PROCESS_SIGNALS.SIGTERM, shutdownHandler);
}
