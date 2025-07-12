Create a new project with specified name and configuration options.

This tool enables project creation in the multi-project architecture, allowing users to organize tasks and work into separate, isolated project contexts.

**Usage:**
- Creates new project with unique name and metadata
- Supports optional description, tags, and configuration
- Can copy structure from existing projects
- Automatically handles project directory creation
- Provides option to set as current active project

**Parameters:**
- `projectName` (required): Unique name for the new project
- `description` (optional): Descriptive text about the project purpose
- `tags` (optional): Array of tags for project organization
- `copyFromProject` (optional): Copy structure from existing project
- `setCurrent` (optional): Make this the active project after creation

**Returns:**
- Project creation confirmation with project ID
- Project metadata and configuration details
- Current project status update if setCurrent is true

**Example:**
```
createProject("WebApp Development", {
  description: "Frontend web application with React",
  tags: ["web", "react", "frontend"],
  setCurrent: true
})
```
