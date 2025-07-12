// Application-wide constants
// No dependencies on other utils - only types if needed

/**
 * Default project and plan identifiers
 */
export const DEFAULT_PROJECT_ID = "default";
export const DEFAULT_PROJECT_NAME = "Default Project";
export const DEFAULT_PLAN_ID = "default";
export const DEFAULT_PLAN_NAME = "Default Plan";

/**
 * Data file names
 */
export const TASKS_FILE_NAME = "tasks.json";
export const PROJECTS_FILE_NAME = "projects.json";
export const WEBGUI_FILE_NAME = "WebGUI.md";

/**
 * Directory names
 */
export const DATA_DIR_NAME = "data";
export const PROJECTS_DIR_NAME = "projects";
export const PLANS_DIR_NAME = "plans";
export const PUBLIC_DIR_NAME = "public";

/**
 * Server configuration constants
 */
export const SERVER_NAME = "Shrimp Task Manager Enhanced";
export const SERVER_VERSION = "2.0.0";

/**
 * Environment variable keys
 */
export const ENV_KEYS = {
  DATA_DIR: "DATA_DIR",
  ENABLE_GUI: "ENABLE_GUI", 
  WEB_PORT: "WEB_PORT",
  TEMPLATES_USE: "TEMPLATES_USE"
} as const;

/**
 * GUI configuration constants
 */
export const GUI_CONFIG = {
  DEFAULT_LANGUAGE: "en",
  LANGUAGE_MAPPING: {
    zh: "zh-TW",
    en: "en"
  } as const
} as const;

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  PROJECTS: "/api/projects",
  PLANS: "/api/plans", 
  PLANS_SET_ACTIVE: "/api/plans/set-active",
  TASKS: "/api/tasks",
  TASKS_STREAM: "/api/tasks/stream",
  TASKS_UPDATE: "/api/tasks/update"
} as const;

/**
 * HTTP response messages
 */
export const HTTP_MESSAGES = {
  PROJECT_REQUIRED: "Project parameter is required",
  PROJECT_NOT_FOUND: (projectName: string) => `Project '${projectName}' not found`,
  PLAN_NOT_FOUND: (planName: string, projectName: string) => 
    `Plan '${planName}' not found in project '${projectName}'`,
  MISSING_REQUIRED_PARAMS: "Missing required parameters: projectName and planName are required",
  INVALID_PARAM_TYPES: "Invalid parameter types: projectName and planName must be strings",
  SWITCH_PLAN_SUCCESS: (planName: string, projectName: string) => 
    `Successfully set '${planName}' as active plan in project '${projectName}'`,
  MISSING_TASK_DATA: "Missing taskId or updates",
  FAILED_TO_LIST_PROJECTS: "Failed to list projects",
  FAILED_TO_LIST_PLANS: "Failed to list plans", 
  FAILED_TO_SWITCH_PLAN: "Failed to switch plan",
  FAILED_TO_UPDATE_TASK: "Failed to update task",
  FAILED_TO_READ_TASKS: "Failed to read tasks data",
  FAILED_TO_RETRIEVE_TASKS: "Failed to retrieve tasks",
  INVALID_RESPONSE_FORMAT: "Invalid response format",
  INTERNAL_SERVER_ERROR: "Internal server error"
} as const;

/**
 * SSE (Server-Sent Events) configuration
 */
export const SSE_CONFIG = {
  HEADERS: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  },
  EVENTS: {
    UPDATE: "update",
    CONNECTED: "connected"
  },
  UPDATE_TYPES: {
    TASKS: "tasks",
    PROJECTS: "projects", 
    PLANS: "plans",
    BOTH: "both"
  },
  ACTIONS: {
    CREATED: "created",
    UPDATED: "updated", 
    DELETED: "deleted"
  }
} as const;

/**
 * Process signals for graceful shutdown
 */
export const PROCESS_SIGNALS = {
  SIGINT: "SIGINT",
  SIGTERM: "SIGTERM"
} as const;

/**
 * Context file names
 */
export const CONTEXT_FILE_NAMES = {
  PROJECT_CONTEXT: "project-context.json",
  PLAN_CONTEXT: "plan-context.json"
} as const;

/**
 * Backup configuration
 */
export const BACKUP_CONFIG = {
  DIRECTORY: "backups",
  MIGRATION_MARKER: ".plan-migration-completed"
} as const;
