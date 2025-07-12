# MCP Shrimp Task Manager Enhanced - AI Agent Development Standards

## Project Overview

**Project Type**: MCP (Model Context Protocol) Task Management Server  
**Technology Stack**: TypeScript, Node.js, Express.js, Zod, MCP SDK  
**Architecture**: Modular tool system with multi-project support  
**Build Target**: ES2022 with NodeNext module resolution  
**Primary Purpose**: AI-assisted task management and workflow orchestration  

---

## TypeScript Development Standards

### Module and Import Requirements

- **MANDATORY**: Use `.js` extensions in import statements (TypeScript ES modules)
- **MANDATORY**: Import from compiled output paths, not source paths
- **MANDATORY**: Use ES2022+ syntax with async/await patterns throughout

```typescript
// CORRECT - ES module imports with .js extension
import { taskManager } from "./models/taskModel.js";
import { loadPromptFromTemplate } from "../prompts/loader.js";

// INCORRECT - Missing .js extension will cause runtime errors
import { taskManager } from "./models/taskModel";
```

### Type Safety Requirements

- **MANDATORY**: Use strict TypeScript mode - all functions must have explicit types
- **MANDATORY**: Define Zod schemas for all tool inputs with proper validation
- **MANDATORY**: Use proper error handling with meaningful error messages
- **FORBIDDEN**: Using `any` type without explicit justification

```typescript
// CORRECT - Proper tool implementation pattern
export const exampleToolSchema = z.object({
  projectName: z.string().describe("Project name or ID"),
  taskId: z.string().uuid("Must be valid UUID")
});

export type ExampleToolArgs = z.infer<typeof exampleToolSchema>;

export async function exampleTool(args: ExampleToolArgs) {
  try {
    // Implementation with proper error handling
    return { content: [{ type: "text", text: "Success" }] };
  } catch (error) {
    return { content: [{ type: "text", text: `Error: ${error.message}` }] };
  }
}
```

---

## Tool Development Architecture

### Tool Organization Standards

- **MANDATORY**: Organize tools by functional category in `src/tools/`
- **MANDATORY**: Each tool category has its own directory and index.ts
- **MANDATORY**: Export all tools through main `src/tools/index.ts`

```
src/tools/
├── index.ts              # Export all tool categories
├── task/                 # Task management tools
│   ├── index.ts         # Export task tools
│   ├── addTask.ts       # Individual tool implementation
│   └── ...
├── project/             # Project management tools
├── thought/             # Reasoning and reflection tools
└── research/            # Research mode functionality
```

### Tool Implementation Pattern

**MANDATORY**: Follow this exact pattern for all new tools:

```typescript
// 1. Import dependencies
import { z } from "zod";
import { loadPromptFromTemplate } from "../../prompts/loader.js";

// 2. Define Zod schema with descriptions
export const toolNameSchema = z.object({
  parameter: z.string().min(1).describe("Parameter description"),
  optionalParam: z.boolean().optional().describe("Optional parameter")
});

export type ToolNameArgs = z.infer<typeof toolNameSchema>;

// 3. Implement tool function
export async function toolName(args: ToolNameArgs) {
  try {
    // Validate project context if needed
    await projectManager.initialize();
    
    // Tool implementation logic
    const result = await processLogic(args);
    
    // Use template for response
    const response = loadPromptFromTemplate("toolName/success.md", {
      result,
      timestamp: new Date().toISOString()
    });

    return { content: [{ type: "text", text: response }] };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { content: [{ type: "text", text: `Error in ${toolName.name}: ${errorMsg}` }] };
  }
}
```

### MCP Server Integration

**MANDATORY**: When adding new tools to the system:

1. Add tool export to appropriate category index.ts
2. Add tool import to main `src/tools/index.ts`
3. Register tool in main `src/index.ts` in both:
   - ListToolsRequestSchema handler
   - CallToolRequestSchema handler

---

## Template System Standards

### Template Organization

- **MANDATORY**: Create templates in ALL language directories (`templates_en/`, `templates_zh/`)
- **MANDATORY**: Use Handlebars syntax for variable substitution
- **MANDATORY**: Organize templates by tool name in subdirectories

```
src/prompts/
├── templates_en/
│   ├── toolName/
│   │   ├── success.md
│   │   ├── error.md
│   │   └── index.md
│   └── ...
├── templates_zh/          # Mirror structure for Chinese
└── templates_custom/      # User custom templates
```

### Template Loading Standards

```typescript
// CORRECT - Template loading with variable substitution
const message = loadPromptFromTemplate("toolName/success.md", {
  taskId: task.id,
  projectName: project.name,
  timestamp: new Date().toISOString()
});

// CORRECT - Template with conditional content
const response = loadPromptFromTemplate("toolName/status.md", {
  isCompleted: task.status === TaskStatus.COMPLETED,
  completionSummary: task.summary || "No summary available"
});
```

### Environment Variable Integration

- **MANDATORY**: Support prompt customization via environment variables
- **MANDATORY**: Use naming pattern `MCP_PROMPT_{TOOL_NAME}` and `MCP_PROMPT_{TOOL_NAME}_APPEND`
- **MANDATORY**: Implement through `loadPrompt()` function in prompt loader

---

## Multi-Project Architecture Standards

### Project Context Management

**MANDATORY**: All task operations must be project-aware:

```typescript
// CORRECT - Project-aware task operations
export async function taskOperation(args: { projectName: string; /* other args */ }) {
  // Initialize project manager
  await projectManager.initialize();
  
  // Validate project exists
  const projectExists = await projectManager.projectExists(args.projectName);
  if (!projectExists) {
    throw new Error(`Project '${args.projectName}' not found`);
  }
  
  // Load project-specific tasks
  const tasks = await loadProjectTasks(args.projectName);
  
  // Perform operation...
}
```

### Project Data Storage

- **MANDATORY**: Use project-specific data directories under `DATA_DIR/projects/`
- **MANDATORY**: Store project metadata in `projects.json`
- **MANDATORY**: Store project tasks in `DATA_DIR/projects/{projectId}/tasks.json`
- **FORBIDDEN**: Direct access to legacy `DATA_DIR/tasks.json` (backwards compatibility only)

---

## Web GUI Development Standards

### API Endpoint Standards

**MANDATORY**: All API endpoints must support project context:

```javascript
// CORRECT - Project-aware API endpoint
app.get("/api/tasks", async (req, res) => {
  try {
    const projectParam = req.query.project as string;
    
    if (projectParam) {
      // Project-specific loading
      await projectManager.initialize();
      const projectExists = await projectManager.projectExists(projectParam);
      if (!projectExists) {
        res.status(404).json({ error: `Project '${projectParam}' not found` });
        return;
      }
      
      const tasks = await loadProjectTasks(projectParam);
      res.json({ tasks });
    } else {
      // Backwards compatibility fallback
      const tasks = await loadProjectTasks('default');
      res.json({ tasks });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve tasks" });
  }
});
```

### Server-Sent Events (SSE) Standards

**MANDATORY**: Real-time updates must include project context:

```javascript
// CORRECT - Project-aware SSE updates
function sendSseUpdate(options: {
  projectId?: string;
  updateType?: 'tasks' | 'projects' | 'both';
  action?: 'created' | 'updated' | 'deleted';
  data?: any;
} = {}) {
  const updateMessage = {
    timestamp: Date.now(),
    projectId: options.projectId || null,
    updateType: options.updateType || 'tasks',
    action: options.action || 'updated',
    data: options.data || null
  };
  
  sseClients.forEach((client) => {
    if (!client.writableEnded) {
      client.write(`event: update\ndata: ${JSON.stringify(updateMessage)}\n\n`);
    }
  });
}
```

### Internationalization Standards

- **MANDATORY**: Support language switching via URL parameter `?lang=en`
- **MANDATORY**: Map template directories to language codes (templates_en → en, templates_zh → zh-TW)
- **MANDATORY**: Create translation files in `src/public/locales/` for web GUI
- **MANDATORY**: Update both English and Chinese locale files when adding UI features

---

## File Organization and Coordination Rules

### Multi-File Coordination Requirements

**MANDATORY**: When modifying these file groups, consider coordination:

- **Template Changes**: Update ALL language directories (`templates_en/`, `templates_zh/`)
- **Tool Addition**: Update tool category index.ts → main tools/index.ts → main index.ts
- **Schema Changes**: Update types/index.ts → related model files → affected tools
- **Web GUI Changes**: Update HTML + CSS + JavaScript + locale files
- **API Changes**: Update backend endpoints + frontend JavaScript + SSE handling

### File Modification Standards

**MANDATORY**: When updating existing files:

- **Complete Function Updates**: Provide entire function from signature to closing brace
- **Complete Interface Updates**: Provide entire interface/type definition
- **Template Updates**: Provide complete template file content
- **Configuration Updates**: Provide complete configuration section

**FORBIDDEN**: Partial updates to:
- Method bodies without full context
- Template files without complete content
- Complex data structures without full definition

---

## Error Handling and Logging Standards

### Error Handling Pattern

**MANDATORY**: All tool functions must follow this error handling pattern:

```typescript
export async function toolFunction(args: ToolArgs) {
  try {
    // Validate inputs
    const parsedArgs = toolSchema.parse(args);
    
    // Initialize required services
    await projectManager.initialize();
    
    // Main logic with specific error messages
    const result = await performOperation(parsedArgs);
    
    // Success response with templates
    const response = loadPromptFromTemplate("tool/success.md", { result });
    return { content: [{ type: "text", text: response }] };
    
  } catch (error) {
    // Specific error handling
    if (error instanceof ZodError) {
      return { content: [{ type: "text", text: `Validation error: ${error.message}` }] };
    }
    
    if (error instanceof ProjectNotFoundError) {
      return { content: [{ type: "text", text: `Project error: ${error.message}` }] };
    }
    
    // Generic error fallback
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { content: [{ type: "text", text: `Error in ${toolFunction.name}: ${errorMsg}` }] };
  }
}
```

### MCP Compatibility Requirements

**FORBIDDEN**: Console logging in production (breaks MCP protocol)
**MANDATORY**: Set `process.env.MCP_DISABLE_CONSOLE_LOGGING = 'true'` during server operations
**MANDATORY**: Use silent error handling for migration and startup operations

---

## Build and Development Standards

### Compilation Requirements

**MANDATORY**: Build process must include:

```bash
# TypeScript compilation
tsc

# Copy template files to dist
copyfiles -u 1 "src/**/*.md" dist

# Copy web GUI assets to dist  
copyfiles -u 1 "src/public/**/*" dist

# Add shebang for CLI usage
node scripts/add-shebang.js
```

### Development Environment Setup

**MANDATORY**: Environment variables must be configured:

```env
# REQUIRED
DATA_DIR=/absolute/path/to/data

# REQUIRED for template system
TEMPLATES_USE=en

# OPTIONAL
ENABLE_GUI=false
WEB_PORT=3000
```

### Dependency Management

**MANDATORY**: All imports must use exact dependency versions:
- `@modelcontextprotocol/sdk`: MCP protocol implementation
- `zod`: Schema validation (all tool inputs)
- `express`: Web GUI server (when ENABLE_GUI=true)
- `uuid`: Task and project ID generation
- `handlebars`: Template processing

---

## Prohibited Actions and Decision Guidelines

### Prohibited Without Explicit Approval

**FORBIDDEN**: Breaking changes to existing tool interfaces
**FORBIDDEN**: Modifying core data structures (Task, Project interfaces) without migration plan
**FORBIDDEN**: Changes to MCP protocol implementation
**FORBIDDEN**: Removing backwards compatibility features
**FORBIDDEN**: Direct database operations (use model layer abstractions)

### Architecture Decision Rules

**When adding new functionality**:
1. Use existing patterns (Zod validation, template responses, project-aware operations)
2. Follow tool organization structure
3. Add to appropriate functional category
4. Maintain multi-language template support

**When modifying existing functionality**:
1. Preserve existing interfaces for backwards compatibility
2. Update all related template files
3. Consider multi-project coordination requirements
4. Test both MCP and Web GUI functionality

### Complex Change Approval Process

**MANDATORY**: Present proposal for these changes:
- New tool categories or major architectural changes
- Database schema modifications
- MCP protocol extensions
- Breaking changes to existing APIs

**Proposal Format**:
```
Problem Statement: [Clear description]
Current Limitations: [What doesn't work]
Proposed Solution: [Technical approach]
Compatibility Impact: [Backwards compatibility analysis]
Implementation Plan: [Step-by-step approach]
```

---

## Examples

### Good Practice - Complete Tool Implementation

```typescript
// tools/task/exampleTool.ts
import { z } from "zod";
import { loadPromptFromTemplate } from "../../prompts/loader.js";
import { projectManager } from "../../models/projectModel.js";

export const exampleToolSchema = z.object({
  projectName: z.string().describe("Project name or ID"),
  taskName: z.string().min(1).describe("Task name"),
  description: z.string().min(10).describe("Task description")
});

export type ExampleToolArgs = z.infer<typeof exampleToolSchema>;

export async function exampleTool(args: ExampleToolArgs) {
  try {
    await projectManager.initialize();
    
    const projectExists = await projectManager.projectExists(args.projectName);
    if (!projectExists) {
      throw new Error(`Project '${args.projectName}' not found`);
    }

    // Tool implementation
    const result = await createTask(args);
    
    const response = loadPromptFromTemplate("exampleTool/success.md", {
      taskId: result.id,
      projectName: args.projectName,
      timestamp: new Date().toISOString()
    });

    return { content: [{ type: "text", text: response }] };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { content: [{ type: "text", text: `Error in example tool: ${errorMsg}` }] };
  }
}
```

### Good Practice - Template File Coordination

```markdown
<!-- templates_en/exampleTool/success.md -->
# Task Created Successfully

**Task ID**: {{taskId}}  
**Project**: {{projectName}}  
**Created**: {{timestamp}}

## Next Steps
- Review task details with `get_task_detail`
- Begin implementation when ready
- Use `verify_task` when complete
```

```markdown
<!-- templates_zh/exampleTool/success.md -->
# 任務創建成功

**任務ID**: {{taskId}}  
**項目**: {{projectName}}  
**創建時間**: {{timestamp}}

## 下一步
- 使用 `get_task_detail` 查看任務詳情
- 準備好後開始實施
- 完成後使用 `verify_task` 驗證
```

---

## Decision Summary

**Language**: TypeScript ES2022 with strict mode and NodeNext modules  
**Architecture**: Modular tool system with project-aware operations  
**Templates**: Multi-language support with environment customization  
**Web GUI**: Express.js with SSE real-time updates and internationalization  
**Error Handling**: Comprehensive error handling with MCP compatibility  
**Build Process**: TypeScript compilation with asset copying and CLI setup  

---

**Document Version**: 1.0  
**Created**: July 8, 2025  
**Target Audience**: AI Development Agents  
**Project Phase**: Enhancement and Multi-Project Support  