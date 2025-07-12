Permanently delete a project and all its associated data.

**⚠️ WARNING: This operation is irreversible and will permanently delete all project data including tasks, configurations, and metadata.**

This tool provides secure project deletion with comprehensive safety checks and confirmation requirements.

**Usage:**
- Permanently removes project and all associated data
- Requires explicit confirmation for safety
- Creates automatic backup before deletion
- Handles project dependencies and references
- Updates system context if deleting current project

**Parameters:**
- `projectName` (required): Name of the project to delete
- `confirmDelete` (required): Must be true to confirm deletion
- `backup` (optional): Create backup before deletion (default: true)

**Returns:**
- Deletion confirmation with backup information
- Summary of deleted data (task counts, file counts)
- Context update information if current project was deleted
- Recovery information and backup location

**Safety Features:**
- Requires explicit confirmation flag
- Automatically creates backup before deletion
- Validates project exists before attempting deletion
- Checks for active tasks and provides warnings
- Prevents deletion of system default project

**Data Deleted:**
- All tasks within the project
- Project configuration and metadata
- Project-specific files and directories
- Task history and completion records

**Example:**
```
deleteProject("OldProject", {
  confirmDelete: true,
  backup: true
})
```
