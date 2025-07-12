# ⚠️ Confirm Project Deletion

**Project:** {{projectName}} ({{projectId}})  
**Description:** {{description}}  
**Tasks:** {{taskCount}} tasks will be permanently deleted

## ⚠️ WARNING: This action cannot be undone!

Deleting this project will:

- **Permanently delete** all {{taskCount}} tasks in this project
- **Remove all project data** including configurations and metadata  
- **Create a backup** in the memory directory (if supported)
- **Cannot be reversed** once confirmed

## To Confirm Deletion

Use the command with confirmation:

```
deleteProject("{{projectName}}", true)
```

## Alternative Actions

Instead of deleting, you might want to:

- **Archive the project** (if supported in future versions)
- **Export project data** before deletion
- **Move tasks** to another project first

**⛔ Only proceed if you're absolutely certain you want to delete this project and all its data.**
