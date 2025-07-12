Switch the current active project context to a different project.

This tool changes the active project context, affecting all subsequent task operations. All task management commands will operate within the newly selected project scope.

**Usage:**
- Changes current active project to specified project
- Updates system context for all task operations
- Provides confirmation of project switch
- Shows impact of context change on operations

**Parameters:**
- `projectName` (required): Name of the project to switch to
- `confirm` (optional): Confirmation flag for safety (default: false)

**Returns:**
- Project switch confirmation with previous and new project names
- Updated project context information
- Impact summary of the context change
- Available actions in the new project context

**Context Impact:**
- All subsequent task operations use the new project
- Task listings show tasks from the new project only
- Task creation adds tasks to the new project
- Project-specific configurations apply

**Safety Features:**
- Validates target project exists before switching
- Provides clear confirmation of context change
- Shows project details before and after switch
- Preserves previous project information for reference

**Example:**
```
switchProject("WebApp Development", {
  confirm: true
})
```
