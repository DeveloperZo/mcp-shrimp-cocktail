# 🔍 Project Not Found

**Requested Project:** {{projectName}}

Cannot list plans because the project "{{projectName}}" was not found.

## Available Projects

{{#each availableProjects}}
- **{{name}}** (ID: {{id}})
{{/each}}

## What to Do

1. Use a project name from the list above
2. Create the project first if needed:
   ```
   create_project name="{{projectName}}" description="Your project description"
   ```
3. Use `list_projects` to see all available projects

Please specify a valid project name and try again.
