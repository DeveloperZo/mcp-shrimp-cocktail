# ✅ Plan Deleted Successfully

**Deleted Plan:** {{planName}} (ID: {{planId}})  
**Project:** {{projectName}}

## Deletion Summary

The plan has been permanently deleted from the project.

{{#if backupInfo}}
📁 **Backup Status:** {{backupInfo}}
{{/if}}

## What Happened

1. All tasks in the plan were removed
2. Plan metadata was deleted
3. A backup was created before deletion
4. The current plan was switched to the default plan (if needed)

## Next Steps

- View remaining plans: `list_plans projectName="{{projectName}}"`
- Create a new plan: `create_plan projectName="{{projectName}}" name="New Plan" description="Description"`
- Continue working in the current plan: `list_tasks projectName="{{projectName}}" status="all"`

The plan has been successfully removed from the project.
