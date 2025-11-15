/**
 * MCP Server Error Handling Utilities
 * Provides structured error responses following MCP protocol
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ZodError } from "zod";

/**
 * Error codes for different error types
 */
export enum McpErrorCode {
  TOOL_NOT_FOUND = "TOOL_NOT_FOUND",
  MISSING_ARGUMENTS = "MISSING_ARGUMENTS",
  INVALID_ARGUMENTS = "INVALID_ARGUMENTS",
  TOOL_EXECUTION_ERROR = "TOOL_EXECUTION_ERROR",
  PROMPT_NOT_FOUND = "PROMPT_NOT_FOUND",
  MISSING_PROMPT_ARGUMENTS = "MISSING_PROMPT_ARGUMENTS",
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

/**
 * Error response options
 */
export interface ErrorResponseOptions {
  code: McpErrorCode;
  message: string;
  details?: any;
  availableTools?: string[];
  availablePrompts?: string[];
  toolName?: string;
  promptName?: string;
  resourceUri?: string;
}

/**
 * Create a structured error response for tool calls
 */
export function createErrorResponse(options: ErrorResponseOptions): CallToolResult {
  const { code, message, details, availableTools, toolName } = options;
  
  let errorText = `Error [${code}]: ${message}`;
  
  if (toolName) {
    errorText += `\nTool: ${toolName}`;
  }
  
  if (details) {
    if (details instanceof Error) {
      errorText += `\n\nDetails: ${details.message}`;
      if (details.stack && process.env.NODE_ENV === "development") {
        errorText += `\n\nStack: ${details.stack}`;
      }
    } else if (Array.isArray(details)) {
      // Zod error details
      const zodErrors = details as Array<{ path: (string | number)[]; message: string }>;
      errorText += `\n\nValidation Errors:`;
      zodErrors.forEach((err, index) => {
        const path = err.path.length > 0 ? err.path.join(".") : "root";
        errorText += `\n  ${index + 1}. ${path}: ${err.message}`;
      });
    } else {
      errorText += `\n\nDetails: ${JSON.stringify(details, null, 2)}`;
    }
  }
  
  if (availableTools && availableTools.length > 0) {
    errorText += `\n\nAvailable tools: ${availableTools.join(", ")}`;
  }
  
  // Add recovery suggestion based on error code
  switch (code) {
    case McpErrorCode.TOOL_NOT_FOUND:
      errorText += `\n\nSuggestion: Check the tool name spelling or use list_tools to see available tools.`;
      break;
    case McpErrorCode.INVALID_ARGUMENTS:
      errorText += `\n\nSuggestion: Review the tool's input schema and provide valid arguments.`;
      break;
    case McpErrorCode.MISSING_ARGUMENTS:
      errorText += `\n\nSuggestion: Provide the required arguments for this tool.`;
      break;
    case McpErrorCode.TOOL_EXECUTION_ERROR:
      errorText += `\n\nSuggestion: Check the error details above and try again with corrected inputs.`;
      break;
  }
  
  return {
    content: [
      {
        type: "text",
        text: errorText,
      },
    ],
    isError: true,
  };
}

/**
 * Create error response from Zod validation error
 */
export function createValidationErrorResponse(
  toolName: string,
  error: ZodError,
  availableTools?: string[]
): CallToolResult {
  return createErrorResponse({
    code: McpErrorCode.INVALID_ARGUMENTS,
    message: `Invalid arguments for tool '${toolName}'`,
    details: error.errors.map((err) => ({
      path: err.path,
      message: err.message,
    })),
    toolName,
    availableTools,
  });
}

/**
 * Create error response from generic error
 */
export function createExecutionErrorResponse(
  toolName: string,
  error: unknown,
  availableTools?: string[]
): CallToolResult {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  return createErrorResponse({
    code: McpErrorCode.TOOL_EXECUTION_ERROR,
    message: `Tool execution failed: ${errorMessage}`,
    details: error instanceof Error ? error : { error: String(error) },
    toolName,
    availableTools,
  });
}

/**
 * Create error response for missing tool
 */
export function createToolNotFoundResponse(
  toolName: string,
  availableTools: string[]
): CallToolResult {
  return createErrorResponse({
    code: McpErrorCode.TOOL_NOT_FOUND,
    message: `Tool '${toolName}' not found`,
    toolName,
    availableTools,
  });
}

/**
 * Create error response for missing arguments
 */
export function createMissingArgumentsResponse(toolName: string): CallToolResult {
  return createErrorResponse({
    code: McpErrorCode.MISSING_ARGUMENTS,
    message: "No arguments provided",
    toolName,
  });
}

