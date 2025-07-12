# ❌ Project Name Required

## Issue

No project name was specified in your request.

## What This Means

- **Project name missing** - All operations require explicit project specification
- **Invalid request format** - Project parameter is mandatory
- **System requires explicit naming** for all project operations

## How to Resolve

1. **List all projects** to see what's available:
   ```
   listProjects()
   ```

2. **Get specific project info** by name:
   ```
   getProjectInfo("project-name")
   ```

3. **Create a new project** if needed:
   ```
   createProject("My Project")
   ```

4. **Use explicit project names** in all operations:
   ```
   # Always specify the project name
   getProjectInfo("my-project")
   listTasks("my-project")
   addTask("my-project", "task description")
   ```

## System Design

This system requires explicit project specification for all operations to ensure:

- **Clear intent** - You always know which project you're working with
- **Data safety** - No accidental operations on wrong projects
- **Multi-project support** - Work across multiple projects simultaneously
- **Consistent behavior** - All tools work the same way

Please specify a project name and try your request again.
