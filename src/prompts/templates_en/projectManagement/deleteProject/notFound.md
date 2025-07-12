# ❌ Project Not Found for Deletion

**Searched for:** {{projectName}}

## Available Projects

{{#each availableProjects}}
- **{{name}}** (ID: `{{id}}`)
{{/each}}

## How to Delete Projects

Use the **exact project name** or **project ID**:

- `deleteProject("Project Name", true)` - Using the full project name
- `deleteProject("project-id", true)` - Using the project ID

## Important Notes

- Project names are **case-sensitive**
- **Confirmation required** - Always include `true` as the second parameter
- Use `listProjects()` to see all available projects
- **Cannot delete default project** for system protection

## Safety Reminder

⚠️ **Project deletion is permanent** and cannot be undone. Make sure you:

1. **Have backups** of important data
2. **Use the correct project name**
3. **Include confirmation** (`true`) in the command

Try again with one of the available project names listed above.
