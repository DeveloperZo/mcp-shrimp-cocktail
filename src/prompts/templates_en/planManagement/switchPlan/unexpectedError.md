# ⚠️ Unexpected Error Switching Plan

**Plan Name:** {{planName}}  
**Error Details:** {{error}}

An unexpected error occurred while switching plans. This might be due to:

- File system permissions issues
- Corrupted context data
- System resource constraints

## What to Do

1. Try switching plans again
2. List plans to verify they exist: `list_plans projectName="{{projectName}}"`
3. Check system resources and permissions

For debugging, the full error message is:
```
{{error}}
```

If the problem persists, you may need to restart the system or check file permissions.
