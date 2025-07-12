Retrieve detailed information about a specific project including metadata, statistics, and current status.

This tool provides comprehensive project analytics and detailed information for project management and monitoring.

**Usage:**
- Retrieves complete project metadata and configuration
- Provides detailed task statistics and analytics
- Shows project activity timeline and history
- Displays project health and status indicators
- Includes file system and storage information

**Parameters:**
- `projectName` (optional): Name of project to query (default: current project)
- `includeTaskStats` (optional): Include detailed task statistics (default: true)
- `includeRecentActivity` (optional): Include recent activity log (default: true)
- `includeFileInfo` (optional): Include file system information (default: false)

**Returns:**
- Complete project metadata (ID, name, description, tags)
- Project timestamps (created, modified, last activity)
- Detailed task statistics (total, by status, completion rate)
- Recent activity summary and timeline
- Project configuration and settings
- Storage and file system information (if requested)

**Project Statistics Include:**
- Total task count and breakdown by status
- Task completion rate and average completion time
- Recent activity metrics and trends
- Project file sizes and storage usage
- Creation and modification history

**Example:**
```
getProjectInfo("WebApp Development", {
  includeTaskStats: true,
  includeRecentActivity: true,
  includeFileInfo: true
})
```
