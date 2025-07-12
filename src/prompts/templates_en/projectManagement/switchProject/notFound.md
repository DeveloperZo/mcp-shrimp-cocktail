# ❌ Project Not Found

**Searched for:** {{projectName}}

## Available Projects

{{#each availableProjects}}
- **{{name}}** (ID: `{{id}}`)
{{/each}}

## How to Switch Projects

Use the **exact project name** or **project ID**:

- `switchProject("Project Name")` - Using the full project name
- `switchProject("project-id")` - Using the project ID

## Tips

- Project names are **case-sensitive**
- Use `listProjects()` to see all available projects
- Copy the exact name from the project list

Try again with one of the available project names listed above.
