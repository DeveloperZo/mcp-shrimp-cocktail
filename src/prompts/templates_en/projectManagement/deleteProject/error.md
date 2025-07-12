# ❌ Failed to Delete Project

**Project:** {{projectName}} ({{projectId}})

## Error Details

{{error}}

## Common Issues

- **File permissions** - Insufficient rights to delete project files
- **Project in use** - Another process may be accessing the project  
- **File system protection** - System preventing file deletion
- **Backup creation failed** - Error during backup process
- **Data corruption** - Project metadata issues

## Safety Information

🛡️ **Good news:** The error prevented deletion, so your project data is safe.

## Troubleshooting Steps

1. **Check file permissions** on the project directory
2. **Close other applications** that might be using project files
3. **Restart the application** and try again
4. **Verify project accessibility:** `getProjectInfo("{{projectName}}")`
5. **Check disk space** for backup creation

## Manual Cleanup

If you need to force deletion (⚠️ **use with extreme caution**):

1. **Create manual backup** of project data first
2. **Contact system administrator** for assistance
3. **Use system file manager** with appropriate permissions

Please resolve the underlying issue before attempting deletion again.
