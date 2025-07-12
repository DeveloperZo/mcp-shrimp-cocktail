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
} from "@modelcontextprotocol/sdk/types.js";

// Import types
import type {
  McpPromptsConfig,
} from "../types/mcp.js";

// Import application constants
import {
  SERVER_NAME,
  SERVER_VERSION,
} from "../utils/constants.js";

// 導入所有工具函數和 schema
import {
  planTask,
  planTaskSchema,
  analyzeTask,
  analyzeTaskSchema,
  reflectTask,
  reflectTaskSchema,
  splitTasks,
  splitTasksSchema,
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
 * Create and configure MCP server instance
 */
export function createMcpServer(): Server {
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
      },
    }
  );

  // Configure list tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        // Task Management Tools
        {
          name: "plan_task",
          description: loadPromptFromTemplate("toolsDescription/planTask.md"),
          inputSchema: zodToJsonSchema(planTaskSchema),
        },
        {
          name: "analyze_task",
          description: loadPromptFromTemplate(
            "toolsDescription/analyzeTask.md"
          ),
          inputSchema: zodToJsonSchema(analyzeTaskSchema),
        },
        {
          name: "reflect_task",
          description: loadPromptFromTemplate(
            "toolsDescription/reflectTask.md"
          ),
          inputSchema: zodToJsonSchema(reflectTaskSchema),
        },
        {
          name: "split_tasks",
          description: loadPromptFromTemplate(
            "toolsDescription/splitTasks.md"
          ),
          inputSchema: zodToJsonSchema(splitTasksRawSchema),
        },
        {
          name: "list_tasks",
          description: loadPromptFromTemplate(
            "toolsDescription/listTasks.md"
          ),
          inputSchema: zodToJsonSchema(listTasksSchema),
        },
        {
          name: "execute_task",
          description: loadPromptFromTemplate(
            "toolsDescription/executeTask.md"
          ),
          inputSchema: zodToJsonSchema(executeTaskSchema),
        },
        {
          name: "verify_task",
          description: loadPromptFromTemplate(
            "toolsDescription/verifyTask.md"
          ),
          inputSchema: zodToJsonSchema(verifyTaskSchema),
        },
        {
          name: "delete_task",
          description: loadPromptFromTemplate(
            "toolsDescription/deleteTask.md"
          ),
          inputSchema: zodToJsonSchema(deleteTaskSchema),
        },
        {
          name: "clear_all_tasks",
          description: loadPromptFromTemplate(
            "toolsDescription/clearAllTasks.md"
          ),
          inputSchema: zodToJsonSchema(clearAllTasksSchema),
        },
        {
          name: "update_task",
          description: loadPromptFromTemplate(
            "toolsDescription/updateTask.md"
          ),
          inputSchema: zodToJsonSchema(updateTaskContentSchema),
        },
        {
          name: "query_task",
          description: loadPromptFromTemplate(
            "toolsDescription/queryTask.md"
          ),
          inputSchema: zodToJsonSchema(queryTaskSchema),
        },
        {
          name: "get_task_detail",
          description: loadPromptFromTemplate(
            "toolsDescription/getTaskDetail.md"
          ),
          inputSchema: zodToJsonSchema(getTaskDetailSchema),
        },
        {
          name: "add_task",
          description: loadPromptFromTemplate(
            "toolsDescription/addTask.md"
          ),
          inputSchema: zodToJsonSchema(addTaskSchema),
        },
        // Thought Processing Tools
        {
          name: "process_thought",
          description: loadPromptFromTemplate(
            "toolsDescription/processThought.md"
          ),
          inputSchema: zodToJsonSchema(processThoughtSchema),
        },
        {
          name: "research_mode",
          description: loadPromptFromTemplate(
            "toolsDescription/researchMode.md"
          ),
          inputSchema: zodToJsonSchema(researchModeSchema),
        },
        // Project Management Tools
        {
          name: "create_project",
          description: loadPromptFromTemplate(
            "toolsDescription/createProject.md"
          ),
          inputSchema: zodToJsonSchema(createProjectSchema),
        },
        {
          name: "list_projects",
          description: loadPromptFromTemplate(
            "toolsDescription/listProjects.md"
          ),
          inputSchema: zodToJsonSchema(listProjectsSchema),
        },
        {
          name: "switch_project",
          description: loadPromptFromTemplate(
            "toolsDescription/switchProject.md"
          ),
          inputSchema: zodToJsonSchema(switchProjectSchema),
        },
        {
          name: "delete_project",
          description: loadPromptFromTemplate(
            "toolsDescription/deleteProject.md"
          ),
          inputSchema: zodToJsonSchema(deleteProjectSchema),
        },
        {
          name: "get_project_info",
          description: loadPromptFromTemplate(
            "toolsDescription/getProjectInfo.md"
          ),
          inputSchema: zodToJsonSchema(getProjectInfoSchema),
        },
        // Plan Management Tools
        {
          name: "create_plan",
          description: loadPromptFromTemplate(
            "toolsDescription/createPlan.md"
          ),
          inputSchema: zodToJsonSchema(createPlanSchema),
        },
        {
          name: "list_plans",
          description: loadPromptFromTemplate(
            "toolsDescription/listPlans.md"
          ),
          inputSchema: zodToJsonSchema(listPlansSchema),
        },
        {
          name: "switch_plan",
          description: loadPromptFromTemplate(
            "toolsDescription/switchPlan.md"
          ),
          inputSchema: zodToJsonSchema(switchPlanSchema),
        },
        {
          name: "delete_plan",
          description: loadPromptFromTemplate(
            "toolsDescription/deletePlan.md"
          ),
          inputSchema: zodToJsonSchema(deletePlanSchema),
        },
        {
          name: "get_plan_info",
          description: loadPromptFromTemplate(
            "toolsDescription/getPlanInfo.md"
          ),
          inputSchema: zodToJsonSchema(getPlanInfoSchema),
        },
        // System Tools
        {
          name: "init_project_rules",
          description: loadPromptFromTemplate(
            "toolsDescription/initProjectRules.md"
          ),
          inputSchema: zodToJsonSchema(initProjectRulesSchema),
        },
      ],
    };
  });

  // Configure call tool handler
  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      try {
        if (!request.params.arguments) {
          throw new Error("No arguments provided");
        }

        let parsedArgs;
        switch (request.params.name) {
          // Task Management Tools
          case "plan_task":
            parsedArgs = await planTaskSchema.safeParseAsync(
              request.params.arguments
            );
            if (!parsedArgs.success) {
              throw new Error(
                `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
              );
            }
            return await planTask(parsedArgs.data);
          case "analyze_task":
            parsedArgs = await analyzeTaskSchema.safeParseAsync(
              request.params.arguments
            );
            if (!parsedArgs.success) {
              throw new Error(
                `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
              );
            }
            return await analyzeTask(parsedArgs.data);
          case "reflect_task":
            parsedArgs = await reflectTaskSchema.safeParseAsync(
              request.params.arguments
            );
            if (!parsedArgs.success) {
              throw new Error(
                `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
              );
            }
            return await reflectTask(parsedArgs.data);
          case "split_tasks":
            parsedArgs = await splitTasksRawSchema.safeParseAsync(
              request.params.arguments
            );
            if (!parsedArgs.success) {
              throw new Error(
                `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
              );
            }
            return await splitTasksRaw(parsedArgs.data);
          case "list_tasks":
            parsedArgs = await listTasksSchema.safeParseAsync(
              request.params.arguments
            );
            if (!parsedArgs.success) {
              throw new Error(
                `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
              );
            }
            return await listTasks(parsedArgs.data);
          case "execute_task":
            parsedArgs = await executeTaskSchema.safeParseAsync(
              request.params.arguments
            );
            if (!parsedArgs.success) {
              throw new Error(
                `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
              );
            }
            return await executeTask(parsedArgs.data);
          case "verify_task":
            parsedArgs = await verifyTaskSchema.safeParseAsync(
              request.params.arguments
            );
            if (!parsedArgs.success) {
              throw new Error(
                `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
              );
            }
            return await verifyTask(parsedArgs.data);
          case "delete_task":
            parsedArgs = await deleteTaskSchema.safeParseAsync(
              request.params.arguments
            );
            if (!parsedArgs.success) {
              throw new Error(
                `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
              );
            }
            return await deleteTask(parsedArgs.data);
          case "clear_all_tasks":
            parsedArgs = await clearAllTasksSchema.safeParseAsync(
              request.params.arguments
            );
            if (!parsedArgs.success) {
              throw new Error(
                `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
              );
            }
            return await clearAllTasks(parsedArgs.data);
          case "update_task":
            parsedArgs = await updateTaskContentSchema.safeParseAsync(
              request.params.arguments
            );
            if (!parsedArgs.success) {
              throw new Error(
                `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
              );
            }
            return await updateTaskContent(parsedArgs.data);
          case "query_task":
            parsedArgs = await queryTaskSchema.safeParseAsync(
              request.params.arguments
            );
            if (!parsedArgs.success) {
              throw new Error(
                `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
              );
            }
            return await queryTask(parsedArgs.data);
          case "get_task_detail":
            parsedArgs = await getTaskDetailSchema.safeParseAsync(
              request.params.arguments
            );
            if (!parsedArgs.success) {
              throw new Error(
                `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
              );
            }
            return await getTaskDetail(parsedArgs.data);
          case "add_task":
            parsedArgs = await addTaskSchema.safeParseAsync(
              request.params.arguments
            );
            if (!parsedArgs.success) {
              throw new Error(
                `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
              );
            }
            return await addTask(parsedArgs.data);
          // Thought Processing Tools
          case "process_thought":
            parsedArgs = await processThoughtSchema.safeParseAsync(
              request.params.arguments
            );
            if (!parsedArgs.success) {
              throw new Error(
                `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
              );
            }
            return await processThought(parsedArgs.data);
          case "research_mode":
            parsedArgs = await researchModeSchema.safeParseAsync(
              request.params.arguments
            );
            if (!parsedArgs.success) {
              throw new Error(
                `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
              );
            }
            return await researchMode(parsedArgs.data);
          // Project Management Tools
          case "create_project":
            parsedArgs = await createProjectSchema.safeParseAsync(
              request.params.arguments
            );
            if (!parsedArgs.success) {
              throw new Error(
                `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
              );
            }
            return await createProject(parsedArgs.data);
          case "list_projects":
            parsedArgs = await listProjectsSchema.safeParseAsync(
              request.params.arguments
            );
            if (!parsedArgs.success) {
              throw new Error(
                `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
              );
            }
            return await listProjects(parsedArgs.data);
          case "switch_project":
            parsedArgs = await switchProjectSchema.safeParseAsync(
              request.params.arguments
            );
            if (!parsedArgs.success) {
              throw new Error(
                `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
              );
            }
            return await switchProject(parsedArgs.data);
          case "delete_project":
            parsedArgs = await deleteProjectSchema.safeParseAsync(
              request.params.arguments
            );
            if (!parsedArgs.success) {
              throw new Error(
                `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
              );
            }
            return await deleteProject(parsedArgs.data);
          case "get_project_info":
            parsedArgs = await getProjectInfoSchema.safeParseAsync(
              request.params.arguments
            );
            if (!parsedArgs.success) {
              throw new Error(
                `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
              );
            }
            return await getProjectInfo(parsedArgs.data);
          // Plan Management Tools
          case "create_plan":
            parsedArgs = await createPlanSchema.safeParseAsync(
              request.params.arguments
            );
            if (!parsedArgs.success) {
              throw new Error(
                `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
              );
            }
            return await createPlan(parsedArgs.data);
          case "list_plans":
            parsedArgs = await listPlansSchema.safeParseAsync(
              request.params.arguments
            );
            if (!parsedArgs.success) {
              throw new Error(
                `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
              );
            }
            return await listPlans(parsedArgs.data);
          case "switch_plan":
            parsedArgs = await switchPlanSchema.safeParseAsync(
              request.params.arguments
            );
            if (!parsedArgs.success) {
              throw new Error(
                `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
              );
            }
            return await switchPlan(parsedArgs.data);
          case "delete_plan":
            parsedArgs = await deletePlanSchema.safeParseAsync(
              request.params.arguments
            );
            if (!parsedArgs.success) {
              throw new Error(
                `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
              );
            }
            return await deletePlan(parsedArgs.data);
          case "get_plan_info":
            parsedArgs = await getPlanInfoSchema.safeParseAsync(
              request.params.arguments
            );
            if (!parsedArgs.success) {
              throw new Error(
                `Invalid arguments for tool ${request.params.name}: ${parsedArgs.error.message}`
              );
            }
            return await getPlanInfo(parsedArgs.data);
          // System Tools
          case "init_project_rules":
            return await initProjectRules();
          default:
            throw new Error(`Tool ${request.params.name} does not exist`);
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error occurred: ${errorMsg} \n Please try correcting the error and calling the tool again`,
            },
          ],
        };
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
    
    switch (name) {
      case "create-development-task":
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: generateTaskCreationPrompt(args)
              }
            }
          ]
        };
        
      case "analyze-codebase":
        return {
          messages: [
            {
              role: "user", 
              content: {
                type: "text",
                text: generateCodebaseAnalysisPrompt(args)
              }
            }
          ]
        };
        
      case "create-research-plan":
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text", 
                text: generateResearchPlanPrompt(args)
              }
            }
          ]
        };
        
      case "debug-task-workflow":
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: generateWorkflowDebugPrompt(args)
              }
            }
          ]
        };
        
      default:
        throw new Error(`Prompt ${name} not found`);
    }
  });

  return server;
}

/**
 * Start MCP server with transport
 */
export async function startMcpServer(): Promise<void> {
  const server = createMcpServer();
  
  // 建立連接
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
