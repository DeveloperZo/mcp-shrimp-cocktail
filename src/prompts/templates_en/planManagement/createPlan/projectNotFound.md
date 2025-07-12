# 🔍 Project Not Found

**Requested Project:** {{projectName}}

The project "{{projectName}}" could not be found. 

## Available Projects

{{#each availableProjects}}
- **{{name}}** (ID: {{id}})
{{/each}}

## What to Do

1. Use an existing project name from the list above
2. Create a new project first:
   ```
   create_project name="{{projectName}}" description="Your project description"
   ```
3. Use `list_projects` to see all available projects

Please specify a valid project name and try again.
