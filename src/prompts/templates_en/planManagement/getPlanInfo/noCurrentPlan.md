# ⚠️ Plan Name Required

**Project:** {{projectName}}

No plan name was specified for this operation.

## What This Means

- **Explicit plan specification required** - All plan operations need a plan name
- **No automatic plan selection** - System requires explicit plan identification
- **Clear operation intent** - Specify exactly which plan you want to work with

## What to Do

1. **List available plans:** `list_plans projectName="{{projectName}}"`
2. **Specify plan name:** `get_plan_info projectName="{{projectName}}" planName="<plan-name>"`
3. **Create a new plan** if needed: `create_plan projectName="{{projectName}}" name="New Plan"`
4. **Always use explicit plan names** in all plan operations

## System Design

This system requires explicit plan specification for all operations to ensure:

- **Clear intent** - Always specify which plan you're working with
- **Data safety** - No accidental operations on wrong plans
- **Multi-plan support** - Work with multiple plans simultaneously
- **Consistent behavior** - All tools work the same way

Please specify a plan name and try your operation again.
