/**
 * MCP (Model Context Protocol) Specific Types
 * These types define the structure for MCP prompts and related configurations
 */

/**
 * MCP Prompt Argument Definition
 */
export interface McpPromptArgument {
  name: string;
  description: string;
  required: boolean;
}

/**
 * MCP Prompt Definition
 */
export interface McpPromptDefinition {
  name: string;
  description: string;
  arguments: McpPromptArgument[];
}

/**
 * MCP Prompts Configuration
 */
export interface McpPromptsConfig {
  [key: string]: McpPromptDefinition;
}

/**
 * SSE (Server-Sent Events) Update Options
 */
export interface SseUpdateOptions {
  projectId?: string;
  updateType?: 'tasks' | 'projects' | 'plans' | 'both';
  action?: 'created' | 'updated' | 'deleted';
  data?: any;
}

/**
 * SSE Update Message Structure
 */
export interface SseUpdateMessage {
  timestamp: number;
  projectId: string | null;
  updateType: 'tasks' | 'projects' | 'plans' | 'both';
  action: 'created' | 'updated' | 'deleted';
  data: any | null;
}

/**
 * Express Request Handler Types for API Endpoints
 */
export interface ApiTaskUpdateRequest {
  taskId: string;
  updates: {
    implementationGuide?: string;
    projectName?: string;
    planName?: string;
  };
}

/**
 * API Response Types
 */
export interface ApiSuccessResponse {
  success: true;
  result?: any;
  message?: string;
  [key: string]: any;
}

export interface ApiErrorResponse {
  error: string;
  details?: string;
}

export interface ApiProjectsResponse {
  projects: any[];
}

export interface ApiPlansResponse {
  plans: any[];
}

export interface ApiTasksResponse {
  tasks: any[];
}

/**
 * Project Query Parameters
 */
export interface ProjectQueryParams {
  project?: string;
  plan?: string;
}

/**
 * Plan API Request Body
 */
export interface SetActivePlanRequest {
  projectName: string;
  planName: string;
}
