# ❌ Project Not Found

**Searched for:** {{projectName}}

## Available Projects

{{#each availableProjects}}
- **{{name}}** (ID: `{{id}}`)
{{/each}}

## How to Get Project Information

Use the **exact project name** or **project ID**:

- `getProjectInfo("Project Name")` - Using the full project name
- `getProjectInfo("project-id")` - Using the project ID
- `getProjectInfo()` - Get current project information (no parameters)

## Tips

- Project names are **case-sensitive**
- Use `listProjects()` to see all available projects with their exact names
- Copy the exact name from the project list for accuracy

## Current Project Information

If you want information about your current project, simply use:

```
getProjectInfo()
```

Try again with one of the available project names listed above.
