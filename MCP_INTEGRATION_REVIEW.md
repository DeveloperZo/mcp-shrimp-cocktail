# MCP Integration Review & Improvement Recommendations

## Executive Summary

This document reviews the current MCP (Model Context Protocol) integration in the Shrimp Task Manager and identifies areas for improvement. The current implementation is functional but has opportunities for better error handling, code organization, and feature completeness.

## Current State Analysis

### ✅ Strengths

1. **Comprehensive Tool Coverage**: 20+ tools properly registered and exposed
2. **Prompt Support**: MCP prompts are implemented and functional
3. **Type Safety**: Uses Zod schemas for validation
4. **Template System**: Well-integrated prompt template loading
5. **Dual Server Support**: Both MCP and Express servers coexist

### ⚠️ Areas for Improvement

## 1. Error Handling & Response Format

### Current Issues

**Location**: `src/server/mcp.ts` lines 657-668

```typescript
catch (error) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  return {
    content: [
      {
        type: "text",
        text: `Error occurred: ${errorMsg} \n Please try correcting the error and calling the tool again`,
      },
    ],
  };
}
```

**Problems**:
- Generic error messages don't help with debugging
- No distinction between validation errors, business logic errors, and system errors
- Error responses don't follow MCP error response format
- No error codes or structured error information

### Recommendations

1. **Implement Structured Error Responses**
   - Use MCP's error response format with proper error codes
   - Distinguish between client errors (4xx) and server errors (5xx)
   - Include error context and recovery suggestions

2. **Error Classification**
   - Validation errors (Zod parsing failures)
   - Business logic errors (project not found, task not found)
   - System errors (file I/O, database issues)

3. **Error Logging** (for debugging while maintaining MCP compatibility)
   - Use structured logging that can be disabled for MCP
   - Log to files instead of console when MCP mode is active

## 2. Code Duplication & Maintainability

### Current Issues

**Location**: `src/server/mcp.ts` lines 396-656

The tool handler has a massive switch statement with 20+ cases, each following the exact same pattern:

```typescript
case "tool_name":
  parsedArgs = await toolSchema.safeParseAsync(request.params.arguments);
  if (!parsedArgs.success) {
    throw new Error(`Invalid arguments...`);
  }
  return await toolFunction(parsedArgs.data);
```

**Problems**:
- 260+ lines of repetitive code
- Adding new tools requires duplicating the same pattern
- Easy to introduce inconsistencies
- Hard to maintain

### Recommendations

1. **Create Tool Registry Pattern**
   ```typescript
   interface ToolHandler {
     schema: z.ZodSchema;
     handler: (args: any) => Promise<CallToolResult>;
   }
   
   const toolRegistry = new Map<string, ToolHandler>([
     ["plan_task", { schema: planTaskSchema, handler: planTask }],
     ["analyze_task", { schema: analyzeTaskSchema, handler: analyzeTask }],
     // ... etc
   ]);
   ```

2. **Generic Tool Handler**
   ```typescript
   server.setRequestHandler(CallToolRequestSchema, async (request) => {
     const tool = toolRegistry.get(request.params.name);
     if (!tool) {
       throw new Error(`Tool ${request.params.name} not found`);
     }
     
     const parsedArgs = await tool.schema.safeParseAsync(request.params.arguments);
     if (!parsedArgs.success) {
       return createErrorResponse("INVALID_ARGUMENTS", parsedArgs.error);
     }
     
     try {
       return await tool.handler(parsedArgs.data);
     } catch (error) {
       return createErrorResponse("TOOL_EXECUTION_ERROR", error);
     }
   });
   ```

3. **Benefits**:
   - Reduces code from ~260 lines to ~30 lines
   - Consistent error handling across all tools
   - Easy to add new tools (just add to registry)
   - Type-safe tool registration

## 3. Missing MCP Features

### Resources Support

**Current State**: No resources are exposed

**Recommendation**: Expose task data, project data, and plan data as MCP resources

```typescript
// Add to server capabilities
capabilities: {
  tools: {},
  prompts: {},
  resources: {}, // Add this
}

// Register resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "shrimp://tasks",
        name: "Task List",
        description: "List of all tasks in the current project",
        mimeType: "application/json"
      },
      {
        uri: "shrimp://projects",
        name: "Project List", 
        description: "List of all projects",
        mimeType: "application/json"
      }
    ]
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  switch (uri) {
    case "shrimp://tasks":
      const tasks = await loadProjectTasks(projectName, planName);
      return {
        contents: [{
          uri,
          mimeType: "application/json",
          text: JSON.stringify(tasks, null, 2)
        }]
      };
    // ... other resources
  }
});
```

**Benefits**:
- Clients can read task/project data without calling tools
- Better integration with MCP clients
- Follows MCP best practices

### Sampling Support

**Current State**: Not implemented

**Recommendation**: If needed for future features, add sampling capability for task execution strategies

### Error Handler Registration

**Current State**: No global error handler

**Recommendation**: Register error handler for unhandled errors

```typescript
server.onerror = (error) => {
  // Log error appropriately
  // Return structured error response
};
```

## 4. Type Safety Improvements

### Current Issues

1. **Loose Error Types**: Error handling uses generic `Error` type
2. **No Error Response Types**: Error responses aren't typed
3. **Tool Registry Types**: Could be more strongly typed

### Recommendations

1. **Create Custom Error Classes**
   ```typescript
   export class McpValidationError extends Error {
     code = "INVALID_ARGUMENTS";
     constructor(message: string, public details?: any) {
       super(message);
     }
   }
   
   export class McpToolError extends Error {
     code = "TOOL_EXECUTION_ERROR";
     constructor(message: string, public toolName: string) {
       super(message);
     }
   }
   ```

2. **Type-Safe Error Responses**
   ```typescript
   interface McpErrorResponse {
     content: Array<{
       type: "text";
       text: string;
     }>;
     isError: true;
     errorCode: string;
   }
   ```

## 5. Prompt Handler Error Handling

### Current Issues

**Location**: `src/server/mcp.ts` lines 679-738

```typescript
default:
  throw new Error(`Prompt ${name} not found`);
```

**Problems**:
- Throwing errors in prompt handlers may not be handled gracefully
- No validation of prompt arguments
- No error recovery

### Recommendations

1. **Validate Prompt Arguments**
   ```typescript
   server.setRequestHandler(GetPromptRequestSchema, async (request) => {
     const { name, arguments: args } = request.params;
     
     const prompt = MCP_PROMPTS[name];
     if (!prompt) {
       return {
         messages: [{
           role: "user",
           content: {
             type: "text",
             text: `Error: Prompt '${name}' not found. Available prompts: ${Object.keys(MCP_PROMPTS).join(', ')}`
           }
         }]
       };
     }
     
     // Validate required arguments
     for (const arg of prompt.arguments) {
       if (arg.required && !args?.[arg.name]) {
         return {
           messages: [{
             role: "user",
             content: {
               type: "text",
               text: `Error: Required argument '${arg.name}' is missing for prompt '${name}'`
             }
           }]
         };
       }
     }
     
     // Generate prompt...
   });
   ```

## 6. Special Case Handling

### Current Issue

**Location**: `src/server/mcp.ts` line 652

```typescript
case "init_project_rules":
  return await initProjectRules();
```

**Problem**: This tool doesn't follow the same validation pattern as others, skipping schema parsing.

### Recommendation

Ensure all tools follow the same pattern, or document why this one is different. If it truly has no arguments, create an empty schema:

```typescript
const initProjectRulesSchema = z.object({});
```

## 7. Server Initialization

### Current Issues

**Location**: `src/server/mcp.ts` lines 746-752

```typescript
export async function startMcpServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
```

**Problems**:
- No error handling during startup
- No connection state management
- No graceful shutdown handling

### Recommendations

1. **Add Error Handling**
   ```typescript
   export async function startMcpServer(): Promise<void> {
     try {
       const server = createMcpServer();
       const transport = new StdioServerTransport();
       await server.connect(transport);
     } catch (error) {
       // Log error appropriately
       process.exit(1);
     }
   }
   ```

2. **Add Graceful Shutdown**
   ```typescript
   process.on('SIGINT', async () => {
     await server.close();
     process.exit(0);
   });
   ```

## 8. Tool Description Loading

### Current Issue

**Location**: `src/server/mcp.ts` lines 200-380

Tool descriptions are loaded synchronously from templates during tool listing. If template loading fails, the entire tool list fails.

### Recommendation

1. **Lazy Load or Cache Descriptions**
2. **Handle Template Loading Errors Gracefully**
3. **Provide Fallback Descriptions**

## 9. Testing & Validation

### Missing

- No unit tests for MCP server
- No integration tests for tool handlers
- No validation of MCP protocol compliance

### Recommendations

1. **Add Unit Tests** for tool registry and error handling
2. **Add Integration Tests** for MCP protocol compliance
3. **Validate Against MCP SDK** types

## 10. Documentation

### Missing

- No documentation on MCP-specific features
- No guide for adding new tools
- No troubleshooting guide for MCP issues

### Recommendations

1. **Add MCP Development Guide**
2. **Document Tool Registration Process**
3. **Add Troubleshooting Section**

## Priority Recommendations

### High Priority (Do First)

1. ✅ **Refactor tool handler** to use registry pattern (reduces code, improves maintainability)
2. ✅ **Improve error handling** with structured error responses
3. ✅ **Add resources support** for better MCP integration

### Medium Priority

4. ⚠️ **Fix prompt handler error handling**
5. ⚠️ **Add server initialization error handling**
6. ⚠️ **Create custom error classes**

### Low Priority (Nice to Have)

7. ℹ️ **Add sampling support** (if needed)
8. ℹ️ **Add comprehensive tests**
9. ℹ️ **Improve documentation**

## Implementation Example

Here's a complete example of the improved tool handler:

```typescript
// tools/registry.ts
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";

export interface ToolDefinition {
  schema: z.ZodSchema;
  handler: (args: any) => Promise<CallToolResult>;
  description?: string;
}

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register(name: string, definition: ToolDefinition): void {
    this.tools.set(name, definition);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  list(): string[] {
    return Array.from(this.tools.keys());
  }
}

// server/mcp.ts
import { ToolRegistry } from "../tools/registry.js";

const toolRegistry = new ToolRegistry();

// Register all tools
toolRegistry.register("plan_task", {
  schema: planTaskSchema,
  handler: planTask
});

toolRegistry.register("analyze_task", {
  schema: analyzeTaskSchema,
  handler: analyzeTask
});

// ... register all other tools

// Simplified tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = toolRegistry.get(request.params.name);
  
  if (!tool) {
    return createErrorResponse({
      code: "TOOL_NOT_FOUND",
      message: `Tool '${request.params.name}' not found`,
      availableTools: toolRegistry.list()
    });
  }

  if (!request.params.arguments) {
    return createErrorResponse({
      code: "MISSING_ARGUMENTS",
      message: "No arguments provided"
    });
  }

  const parsedArgs = await tool.schema.safeParseAsync(request.params.arguments);
  
  if (!parsedArgs.success) {
    return createErrorResponse({
      code: "INVALID_ARGUMENTS",
      message: `Invalid arguments for tool '${request.params.name}'`,
      details: parsedArgs.error.errors
    });
  }

  try {
    return await tool.handler(parsedArgs.data);
  } catch (error) {
    return createErrorResponse({
      code: "TOOL_EXECUTION_ERROR",
      message: error instanceof Error ? error.message : String(error),
      toolName: request.params.name
    });
  }
});

function createErrorResponse(error: {
  code: string;
  message: string;
  details?: any;
  availableTools?: string[];
  toolName?: string;
}): CallToolResult {
  let errorText = `Error [${error.code}]: ${error.message}`;
  
  if (error.details) {
    errorText += `\n\nDetails: ${JSON.stringify(error.details, null, 2)}`;
  }
  
  if (error.availableTools) {
    errorText += `\n\nAvailable tools: ${error.availableTools.join(', ')}`;
  }
  
  return {
    content: [{
      type: "text",
      text: errorText
    }],
    isError: true
  };
}
```

## Conclusion

The current MCP integration is functional but has significant opportunities for improvement in:

1. **Code Quality**: Reduce duplication, improve maintainability
2. **Error Handling**: More structured and helpful error responses
3. **Feature Completeness**: Add resources support
4. **Type Safety**: Better typing throughout
5. **Robustness**: Better error handling and recovery

Implementing these improvements will make the codebase more maintainable, easier to extend, and provide a better experience for MCP clients.

