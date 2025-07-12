# 🔍 Plan Not Found

**Requested Plan:** {{planName}}  
**Project:** {{projectName}}

The plan "{{planName}}" was not found in project "{{projectName}}".

## Available Plans

{{#each availablePlans}}
- **{{name}}** (ID: {{id}})
{{/each}}

## What to Do

1. Use a plan name from the list above
2. Create the plan if needed:
   ```
   create_plan projectName="{{projectName}}" name="{{planName}}" description="Plan description"
   ```
3. Use `list_plans projectName="{{projectName}}"` to see all plans with details

Please specify a valid plan name and try again.
