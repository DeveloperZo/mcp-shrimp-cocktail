# ⚠️ Plan Deletion Confirmation Required

**Plan:** {{planName}} (ID: {{planId}})  
**Project:** {{projectName}}  
**Tasks in Plan:** {{taskCount}}

## Plan Details

- **Description:** {{description}}
- **Tasks:** This plan contains {{taskCount}} tasks

## ⚠️ WARNING

Deleting this plan will:
- **Permanently remove** all {{taskCount}} tasks in the plan
- **Delete** all associated task data and history
- **Create a backup** before deletion (stored in project backups)

This action **cannot be undone**.

## To Confirm Deletion

If you're sure you want to delete this plan, run:

```
delete_plan projectName="{{projectName}}" planName="{{planName}}" confirm=true
```

## Alternatives

- Archive the plan instead (keep data but mark as inactive)
- Export tasks before deletion
- Switch to a different plan: `switch_plan projectName="{{projectName}}" planName="<other-plan>"`
