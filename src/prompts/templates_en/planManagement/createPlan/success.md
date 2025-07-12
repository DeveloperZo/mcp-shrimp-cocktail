# ✅ Plan Created Successfully

**Plan Name:** {{planName}}  
**Plan ID:** {{planId}}  
**Project:** {{projectName}}

## Plan Details

- **Description:** {{description}}
- **Tags:** {{tags}}
{{#if copyFromPlan}}
- **Copied from:** {{copyFromPlan}}
{{/if}}

## Next Steps

1. Use `switch_plan` to activate this plan:
   ```
   switch_plan projectName="{{projectName}}" planName="{{planName}}"
   ```

2. Add tasks to the plan:
   ```
   add_task projectName="{{projectName}}" name="Task name" description="Task description"
   ```

3. View all plans in the project:
   ```
   list_plans projectName="{{projectName}}"
   ```

The plan has been created and is ready for use. All tasks created while this plan is active will be organized within it.
