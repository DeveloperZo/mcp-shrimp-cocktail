# 🆕 Create New Project

Create a new project with specified name and configuration.

**Usage:** `createProject("projectName", options)`

## Parameters

- **projectName** (required): Name of the new project
- **description** (optional): Project description
- **tags** (optional): Project tags for organization
- **copyFrom** (optional): Copy structure from existing project
- **setCurrent** (optional): Make this the active project after creation

## Project Context

Current active project: {currentProject}
Available projects: {availableProjects}

## Example

```
createProject("MyNewProject", {
  description: "A sample project for testing",
  tags: ["development", "testing"],
  setCurrent: true
})
```
