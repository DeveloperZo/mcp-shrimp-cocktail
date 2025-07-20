Add a single task to an existing plan within a project. This tool allows you to quickly add individual tasks to plans that already have some structure or tasks.

## When to Use add_task vs create_plan

**Use `add_task` when:**
- Adding incremental tasks to existing plans that already contain tasks
- A new requirement comes up during development within an active plan
- You need to add a standalone task to a populated plan
- You want to add a task with specific implementation details to an existing workflow
- The plan already has an established structure and you're extending it

**Use `create_plan` instead when:**
- Starting fresh planning for a new project phase or feature
- Working with empty plans that need initial task structure
- You need comprehensive task planning and breakdown
- Setting up the initial workflow for a project plan
- You want to organize multiple related tasks from scratch

**Important:** For empty plans or initial planning, always use `create_plan` first to establish the task structure, then use `add_task` for incremental additions.

**Parameters:**
- `projectName`: Project name or ID where the task should be added (required for multi-project architecture)
- `name`: Task name (1-100 characters)
- `description`: Detailed task description (minimum 10 characters)
- `notes`: Optional additional notes or special requirements
- `dependencies`: Optional array of task IDs this task depends on (within the same plan)
- `relatedFiles`: Optional array of files related to this task
- `implementationGuide`: Optional step-by-step implementation guide
- `verificationCriteria`: Optional verification standards for task completion

**Example usage:**
```json
{
  "projectName": "WebApp Development",
  "name": "Add user authentication",
  "description": "Implement JWT-based user authentication system with login/logout functionality",
  "notes": "Use bcrypt for password hashing, implement rate limiting",
  "dependencies": ["create-user-model-task-id"],
  "relatedFiles": [
    {
      "path": "src/auth/auth.service.ts",
      "type": "CREATE",
      "description": "Main authentication service"
    }
  ],
  "implementationGuide": "1. Install jwt library 2. Create auth service 3. Add middleware 4. Write tests",
  "verificationCriteria": "User can login/logout successfully, passwords are hashed, rate limiting works"
}
```

## Integration with Multi-Project Architecture

This tool integrates seamlessly with the multi-project task management workflow:
- Tasks are added to the currently active plan within the specified project
- Dependencies are resolved within the same plan context
- Created tasks are compatible with all other task management tools
- Supports project-specific workflows and plan organization
