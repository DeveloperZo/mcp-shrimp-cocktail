# 📋 Plans in Project: {{projectName}}

**Total Plans:** {{planCount}}  
**Current Plan:** {{currentPlanId}}

{{#if isMultiPlan}}
## Plan List

| Plan Name | Status | Tasks | Created | Last Activity |
|-----------|--------|-------|---------|---------------|
{{#each plans}}
| {{#if isCurrent}}**→ {{name}}**{{else}}{{name}}{{/if}} | {{statusDisplay}} | {{taskSummary}} | {{formattedCreatedAt}} | {{formattedLastActivity}} |
{{/each}}

## Legend
- **→** indicates the current active plan
- Task counts show completed/total and active tasks

{{else}}
## Single Plan Project

This project has only one plan:

**Plan:** {{plans.[0].name}}  
**Status:** {{plans.[0].statusDisplay}}  
**Tasks:** {{plans.[0].taskSummary}}  
**Created:** {{plans.[0].formattedCreatedAt}}  
**Last Activity:** {{plans.[0].formattedLastActivity}}

{{/if}}

## Quick Actions

- Switch to a plan: `switch_plan projectName="{{projectName}}" planName="<plan-name>"`
- Create new plan: `create_plan projectName="{{projectName}}" name="New Plan" description="Plan description"`
- Get plan details: `get_plan_info projectName="{{projectName}}" planName="<plan-name>"`
- Delete a plan: `delete_plan projectName="{{projectName}}" planName="<plan-name>" confirm=true`

{{#unless includeStats}}
*Note: Task statistics not included. Use `includeStats=true` to see detailed counts.*
{{/unless}}
