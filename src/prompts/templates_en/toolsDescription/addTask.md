Add a single task to the project. This tool allows you to quickly add individual tasks without going through the full planning workflow.

**Use this tool when:**
- You want to add a quick task to an existing project
- A new requirement comes up during development  
- You need to add a standalone task without complex planning
- You want to add a task with specific implementation details

**Parameters:**
- `name`: Task name (1-100 characters)
- `description`: Detailed task description (minimum 10 characters)
- `notes`: Optional additional notes or special requirements
- `dependencies`: Optional array of task IDs this task depends on
- `relatedFiles`: Optional array of files related to this task
- `implementationGuide`: Optional step-by-step implementation guide
- `verificationCriteria`: Optional verification standards for task completion

**Example usage:**
```json
{
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

This tool integrates seamlessly with the existing task management workflow and creates tasks that are compatible with all other task management tools.
