# 🔍 Plan Not Found

**Requested Plan:** {{planName}}  
**Project:** {{projectName}}

The plan "{{planName}}" was not found in project "{{projectName}}".

## Available Plans

{{#each availablePlans}}
- **{{name}}** (ID: {{id}})
{{/each}}

## What to Do

1. Check the plan name spelling
2. Use a plan name from the list above
3. Use `list_plans projectName="{{projectName}}"` to see all plans with details

The requested plan does not exist and cannot be deleted.
