import { loadPromptFromTemplate } from "../prompts/loader.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ZodError } from "zod";

// Import types
import type {
  McpPromptsConfig,
} from "../types/mcp.js";

// Import application constants
import {
  SERVER_NAME,
  SERVER_VERSION,
} from "../utils/constants.js";

// Import tool registry and error handling
import { toolRegistry } from "../tools/registry.js";
import {
  createErrorResponse,
  createValidationErrorResponse,
  createExecutionErrorResponse,
  createToolNotFoundResponse,
  createMissingArgumentsResponse,
  McpErrorCode,
} from "./errors.js";

// 導入所有工具函數和 schema
import {
  planTask,
  planTaskSchema,
  analyzeTask,
  analyzeTaskSchema,
  reflectTask,
  reflectTaskSchema,
  splitTasksRaw,
  splitTasksRawSchema,
  listTasksSchema,
  listTasks,
  executeTask,
  executeTaskSchema,
  verifyTask,
  verifyTaskSchema,
  deleteTask,
  deleteTaskSchema,
  clearAllTasks,
  clearAllTasksSchema,
  updateTaskContent,
  updateTaskContentSchema,
  queryTask,
  queryTaskSchema,
  getTaskDetail,
  getTaskDetailSchema,
  processThought,
  processThoughtSchema,
  initProjectRules,
  initProjectRulesSchema,
  researchMode,
  researchModeSchema,
  addTask,
  addTaskSchema,
  // Import project management tools
  createProject,
  createProjectSchema,
  listProjects,
  listProjectsSchema,
  switchProject,
  switchProjectSchema,
  deleteProject,
  deleteProjectSchema,
  getProjectInfo,
  getProjectInfoSchema,
  // Import plan management tools
  createPlan,
  createPlanSchema,
  listPlans,
  listPlansSchema,
  switchPlan,
  switchPlanSchema,
  deletePlan,
  deletePlanSchema,
  getPlanInfo,
  getPlanInfoSchema,
} from "../tools/index.js";

// Import prompt generators
import {
  generateTaskCreationPrompt,
  generateCodebaseAnalysisPrompt,
  generateResearchPlanPrompt,
  generateWorkflowDebugPrompt
} from "../prompts/generators.js";

// Import models for resources
import { projectManager } from "../models/projectModel.js";
import { loadProjectTasks } from "../models/taskModel.js";
import { planManager } from "../models/planModel.js";

// Define MCP Prompts
const MCP_PROMPTS: McpPromptsConfig = {
  "create-development-task": {
    name: "create-development-task",
    description: "Create a structured development task with dependencies and verification criteria",
    arguments: [
      {
        name: "description",
        description: "Natural language description of what needs to be implemented",
        required: true
      },
      {
        name: "projectName", 
        description: "Project to add the task to (defaults to 'default')",
        required: false
      },
      {
        name: "requirements",
        description: "Specific technical requirements or constraints",
        required: false
      }
    ]
  },
  "analyze-codebase": {
    name: "analyze-codebase",
    description: "Analyze a codebase and break down implementation into structured tasks",
    arguments: [
      {
        name: "codebaseDescription",
        description: "Description of the codebase or system to analyze",
        required: true
      },
      {
        name: "projectName",
        description: "Project context for the analysis",
        required: false
      },
      {
        name: "focusArea",
        description: "Specific area or component to focus the analysis on",
        required: false
      }
    ]
  },
  "create-research-plan": {
    name: "create-research-plan", 
    description: "Create a systematic research plan for technical topics",
    arguments: [
      {
        name: "topic",
        description: "Technical topic or problem to research",
        required: true
      },
      {
        name: "currentKnowledge",
        description: "What you already know about this topic",
        required: false
      },
      {
        name: "goals",
        description: "What you want to achieve with this research",
        required: false
      }
    ]
  },
  "debug-task-workflow": {
    name: "debug-task-workflow",
    description: "Debug and optimize task management workflow",
    arguments: [
      {
        name: "projectName",
        description: "Project to analyze (defaults to 'default')",
        required: false
      },
      {
        name: "issueDescription",
        description: "Description of the workflow issue",
        required: false
      }
    ]
  }
};

/**
 * Register all tools with the registry
 */
function registerAllTools(): void {
  // Task Management Tools
  toolRegistry.register("plan_task", {
    schema: planTaskSchema,
    handler: planTask,
  });
  toolRegistry.register("analyze_task", {
    schema: analyzeTaskSchema,
    handler: analyzeTask,
  });
  toolRegistry.register("reflect_task", {
    schema: reflectTaskSchema,
    handler: reflectTask,
  });
  toolRegistry.register("split_tasks", {
    schema: splitTasksRawSchema,
    handler: splitTasksRaw,
  });
  toolRegistry.register("list_tasks", {
    schema: listTasksSchema,
    handler: listTasks,
  });
  toolRegistry.register("execute_task", {
    schema: executeTaskSchema,
    handler: executeTask,
  });
  toolRegistry.register("verify_task", {
    schema: verifyTaskSchema,
    handler: verifyTask,
  });
  toolRegistry.register("delete_task", {
    schema: deleteTaskSchema,
    handler: deleteTask,
  });
  toolRegistry.register("clear_all_tasks", {
    schema: clearAllTasksSchema,
    handler: clearAllTasks,
  });
  toolRegistry.register("update_task", {
    schema: updateTaskContentSchema,
    handler: updateTaskContent,
  });
  toolRegistry.register("query_task", {
    schema: queryTaskSchema,
    handler: queryTask,
  });
  toolRegistry.register("get_task_detail", {
    schema: getTaskDetailSchema,
    handler: getTaskDetail,
  });
  toolRegistry.register("add_task", {
    schema: addTaskSchema,
    handler: addTask,
  });
  
  // Thought Processing Tools
  toolRegistry.register("process_thought", {
    schema: processThoughtSchema,
    handler: processThought,
  });
  toolRegistry.register("research_mode", {
    schema: researchModeSchema,
    handler: researchMode,
  });
  
  // Project Management Tools
  toolRegistry.register("create_project", {
    schema: createProjectSchema,
    handler: createProject,
  });
  toolRegistry.register("list_projects", {
    schema: listProjectsSchema,
    handler: listProjects,
  });
  toolRegistry.register("switch_project", {
    schema: switchProjectSchema,
    handler: switchProject,
  });
  toolRegistry.register("delete_project", {
    schema: deleteProjectSchema,
    handler: deleteProject,
  });
  toolRegistry.register("get_project_info", {
    schema: getProjectInfoSchema,
    handler: getProjectInfo,
  });
  
  // Plan Management Tools
  toolRegistry.register("create_plan", {
    schema: createPlanSchema,
    handler: createPlan,
  });
  toolRegistry.register("list_plans", {
    schema: listPlansSchema,
    handler: listPlans,
  });
  toolRegistry.register("switch_plan", {
    schema: switchPlanSchema,
    handler: switchPlan,
  });
  toolRegistry.register("delete_plan", {
    schema: deletePlanSchema,
    handler: deletePlan,
  });
  toolRegistry.register("get_plan_info", {
    schema: getPlanInfoSchema,
    handler: getPlanInfo,
  });
  
  // System Tools
  toolRegistry.register("init_project_rules", {
    schema: initProjectRulesSchema,
    handler: initProjectRules,
  });
}

/**
 * Create and configure MCP server instance
 */
export function createMcpServer(): Server {
  // Register all tools
  registerAllTools();

  // 創建MCP服務器
  const server = new Server(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
        prompts: {},
        resources: {},
      },
    }
  );

  // Configure list tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = [];
    const toolMap = toolRegistry.getAll();
    
    // Map tool names to template names (convert snake_case to camelCase)
    const toolNameToTemplate = (toolName: string): string => {
      const parts = toolName.split('_');
      return parts[0] + parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
    };
    
    for (const [name, tool] of toolMap.entries()) {
      try {
        // Get description from template
        const templateName = toolNameToTemplate(name);
        const descriptionPath = `toolsDescription/${templateName}.md`;
        const description = loadPromptFromTemplate(descriptionPath);
        
        tools.push({
          name,
          description,
          inputSchema: zodToJsonSchema(tool.schema),
        });
      } catch (error) {
        // Fallback description if template loading fails
        tools.push({
          name,
          description: tool.description || `Tool: ${name}`,
          inputSchema: zodToJsonSchema(tool.schema),
        });
      }
    }
    
    return { tools };
  });

  // Configure call tool handler using registry
  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      const toolName = request.params.name;
      const availableTools = toolRegistry.list();
      
      // Check if tool exists
      const tool = toolRegistry.get(toolName);
      if (!tool) {
        return createToolNotFoundResponse(toolName, availableTools);
      }

      // Check for arguments (some tools may not require arguments)
      if (!request.params.arguments) {
        // Check if schema requires any fields
        const schemaShape = (tool.schema as any)._def?.shape || {};
        const hasRequiredFields = Object.values(schemaShape).some(
          (field: any) => field._def?.typeName === "ZodOptional" === false
        );
        
        // If schema is empty object or all optional, allow no arguments
        if (Object.keys(schemaShape).length === 0) {
          // Empty schema - call handler with empty object
          try {
            return await tool.handler({});
          } catch (error) {
            return createExecutionErrorResponse(toolName, error, availableTools);
          }
        }
        
        // If there are required fields, return error
        return createMissingArgumentsResponse(toolName);
      }

      // Parse and validate arguments
      const parsedArgs = await tool.schema.safeParseAsync(
        request.params.arguments
      );

      if (!parsedArgs.success) {
        return createValidationErrorResponse(
          toolName,
          parsedArgs.error,
          availableTools
        );
      }

      // Execute tool
      try {
        return await tool.handler(parsedArgs.data);
      } catch (error) {
        return createExecutionErrorResponse(toolName, error, availableTools);
      }
    }
  );

  // Add MCP Prompts Request Handlers
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: Object.values(MCP_PROMPTS)
    };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const availablePrompts = Object.keys(MCP_PROMPTS);
    
    const prompt = MCP_PROMPTS[name];
    if (!prompt) {
      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: createErrorResponse({
              code: McpErrorCode.PROMPT_NOT_FOUND,
              message: `Prompt '${name}' not found`,
              promptName: name,
              availablePrompts,
            }).content[0].text
          }
        }]
      };
    }
    
    // Validate required arguments
    if (prompt.arguments) {
      const missingArgs: string[] = [];
      for (const arg of prompt.arguments) {
        if (arg.required && (!args || !args[arg.name])) {
          missingArgs.push(arg.name);
        }
      }
      
      if (missingArgs.length > 0) {
        return {
          messages: [{
            role: "user",
            content: {
              type: "text",
              text: createErrorResponse({
                code: McpErrorCode.MISSING_PROMPT_ARGUMENTS,
                message: `Missing required arguments for prompt '${name}': ${missingArgs.join(", ")}`,
                promptName: name,
                details: { missingArguments: missingArgs },
              }).content[0].text
            }
          }]
        };
      }
    }
    
    // Generate prompt based on name
    let promptText: string;
    try {
      switch (name) {
        case "create-development-task":
          promptText = generateTaskCreationPrompt(args);
          break;
        case "analyze-codebase":
          promptText = generateCodebaseAnalysisPrompt(args);
          break;
        case "create-research-plan":
          promptText = generateResearchPlanPrompt(args);
          break;
        case "debug-task-workflow":
          promptText = generateWorkflowDebugPrompt(args);
          break;
        default:
          throw new Error(`Prompt generator not found for '${name}'`);
      }
    } catch (error) {
      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: createErrorResponse({
              code: McpErrorCode.INTERNAL_ERROR,
              message: `Failed to generate prompt: ${error instanceof Error ? error.message : String(error)}`,
              promptName: name,
            }).content[0].text
          }
        }]
      };
    }
    
    return {
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: promptText
        }
      }]
    };
  });

  // Add Resources Support
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    try {
      await projectManager.initialize();
      const projects = await projectManager.listProjects();
      
      const resources = [
        {
          uri: "shrimp://projects",
          name: "Projects List",
          description: "List of all projects in the system",
          mimeType: "application/json"
        }
      ];
      
      // Add project-specific resources
      for (const project of projects) {
        resources.push({
          uri: `shrimp://projects/${project.id}/tasks`,
          name: `Tasks for ${project.name}`,
          description: `Tasks in project '${project.name}'`,
          mimeType: "application/json"
        });
        
        // Add plan resources for each project
        await planManager.initialize(project.id);
        const plans = await planManager.listPlans(project.id);
        for (const plan of plans) {
          resources.push({
            uri: `shrimp://projects/${project.id}/plans/${plan.id}/tasks`,
            name: `Tasks for ${project.name} - ${plan.name}`,
            description: `Tasks in project '${project.name}', plan '${plan.name}'`,
            mimeType: "application/json"
          });
        }
      }
      
      return { resources };
    } catch (error) {
      // Return minimal resources list on error
      return {
        resources: [{
          uri: "shrimp://projects",
          name: "Projects List",
          description: "List of all projects in the system",
          mimeType: "application/json"
        }]
      };
    }
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    
    try {
      // Parse URI: shrimp://projects/{projectId}/plans/{planId}/tasks
      const uriMatch = uri.match(/^shrimp:\/\/(projects(?:\/([^\/]+))?(?:\/plans\/([^\/]+))?(?:\/tasks)?)?$/);
      
      if (!uriMatch) {
        return {
          contents: [{
            uri,
            mimeType: "text/plain",
            text: createErrorResponse({
              code: McpErrorCode.RESOURCE_NOT_FOUND,
              message: `Invalid resource URI: ${uri}`,
              resourceUri: uri,
            }).content[0].text
          }]
        };
      }
      
      const [, , projectId, planId] = uriMatch;
      
      if (uri === "shrimp://projects") {
        // List all projects
        await projectManager.initialize();
        const projects = await projectManager.listProjects();
        
        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify(projects, null, 2)
          }]
        };
      }
      
      if (projectId && !planId) {
        // Project tasks (default plan)
        const tasks = await loadProjectTasks(projectId, "default");
        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify(tasks, null, 2)
          }]
        };
      }
      
      if (projectId && planId) {
        // Specific plan tasks
        const tasks = await loadProjectTasks(projectId, planId);
        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify(tasks, null, 2)
          }]
        };
      }
      
      return {
        contents: [{
          uri,
          mimeType: "text/plain",
          text: createErrorResponse({
            code: McpErrorCode.RESOURCE_NOT_FOUND,
            message: `Resource not found: ${uri}`,
            resourceUri: uri,
          }).content[0].text
        }]
      };
    } catch (error) {
      return {
        contents: [{
          uri,
          mimeType: "text/plain",
          text: createErrorResponse({
            code: McpErrorCode.INTERNAL_ERROR,
            message: `Failed to read resource: ${error instanceof Error ? error.message : String(error)}`,
            resourceUri: uri,
          }).content[0].text
        }]
      };
    }
  });

  return server;
}

/**
 * Start MCP server with transport
 */
export async function startMcpServer(): Promise<void> {
  try {
    const server = createMcpServer();
    
    // 建立連接
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    // Set up graceful shutdown
    const shutdown = async () => {
      try {
        await server.close();
        process.exit(0);
      } catch (error) {
        process.exit(1);
      }
    };
    
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    // Silent exit for MCP compatibility
    process.exit(1);
  }
}
