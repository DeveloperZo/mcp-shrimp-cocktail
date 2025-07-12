# 💥 Unexpected Error During Project Switch

**Project:** {{projectName}}

## Error Details

```
{{error}}
```

## What Happened

An unexpected system error occurred while trying to switch to the project. This is typically caused by:

- **System resource constraints** (memory, disk space)
- **File system issues** (permissions, corruption)
- **Internal application errors**
- **Database connectivity problems**

## Recovery Steps

1. **Try again** - The error might be temporary
2. **Check system resources** (disk space, memory)
3. **Restart the application** if needed
4. **Verify project integrity:** `getProjectInfo("{{projectName}}")`
5. **List all projects:** `listProjects()` to ensure system is working

If the error persists, please contact technical support with the error message above.
