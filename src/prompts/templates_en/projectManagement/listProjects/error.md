# ❌ Failed to List Projects

## Error Details

{{error}}

## What This Means

The system was unable to retrieve the project list. This could be due to:

- **Data access issues** - Problems reading project files
- **Permission problems** - Insufficient access to project directory
- **Corrupted data** - Project metadata files may be damaged
- **System resource issues** - Low memory or disk space

## Troubleshooting Steps

1. **Check permissions** on the data directory
2. **Verify disk space** is available
3. **Restart the application** to reset connections
4. **Check project directory integrity** 

## Quick Recovery

If projects exist but aren't loading:

- Try accessing individual projects with `getProjectInfo("project-name")`
- Create a new project to test functionality: `createProject("Test Project")`
- Contact support if the issue persists

Please report this issue with the error details above.
