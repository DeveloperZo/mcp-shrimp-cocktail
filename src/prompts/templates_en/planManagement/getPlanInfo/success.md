# 📊 Plan Information

**Plan:** {{plan.name}}  
**Project:** {{projectName}}  
{{#if isCurrent}}**Status:** ✅ Currently Active{{/if}}

## Plan Details

| Property | Value |
|----------|-------|
| **ID** | {{plan.id}} |
| **Status** | {{plan.statusDisplay}} |
| **Created** | {{plan.formattedCreatedAt}} |
| **Updated** | {{plan.formattedUpdatedAt}} |
| **Last Activity** | {{plan.formattedLastActivity}} |
| **Tags** | {{plan.tagsDisplay}} |

## Task Statistics

| Metric | Value |
|--------|-------|
| **Total Tasks** | {{plan.stats.totalTasks}} |
| **Completed** | {{plan.stats.completedTasks}} ({{plan.completionPercentage}}%) |
| **Active** | {{plan.stats.activeTasks}} |
| **Pending** | {{plan.stats.pendingTasks}} |
| **Blocked** | {{plan.stats.blockedTasks}} |

{{#if plan.description}}
## Description

{{plan.description}}
{{/if}}

## Quick Actions

{{#if isCurrent}}
This is the current active plan. All task operations will work within this plan.
{{else}}
- Switch to this plan: `switch_plan projectName="{{projectName}}" planName="{{plan.name}}"`
{{/if}}
- View tasks: `list_tasks projectName="{{projectName}}" status="all"`
- Add task: `add_task projectName="{{projectName}}" name="Task name" description="Description"`
- Update plan: `update_plan projectName="{{projectName}}" planName="{{plan.name}}" description="New description"`
