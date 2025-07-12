# ✅ Plan Switched Successfully

**Project:** {{projectName}}

## Plan Change Summary

| | Previous Plan | New Plan |
|---|--------------|----------|
| **Name** | {{previousPlanName}} | **→ {{newPlanName}}** |
| **ID** | {{previousPlanId}} | {{newPlanId}} |
| **Tasks** | - | {{taskCount}} tasks |

## What This Means

All task operations will now work within the **{{newPlanName}}** plan:

- New tasks will be created in this plan
- Task listings will show tasks from this plan
- Task operations will affect only this plan's tasks

## Next Steps

- View tasks in this plan: `list_tasks projectName="{{projectName}}" status="all"`
- Add a new task: `add_task projectName="{{projectName}}" name="Task name" description="Description"`
- View plan details: `get_plan_info projectName="{{projectName}}" planName="{{newPlanName}}"`

The plan context has been updated successfully.
