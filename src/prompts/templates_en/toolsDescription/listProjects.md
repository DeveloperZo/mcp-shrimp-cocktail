List all available projects with their metadata and status information.

This tool provides comprehensive overview of all projects in the system, including project status, task counts, and activity information.

**Usage:**
- Lists all projects with detailed metadata
- Shows current active project with indicator
- Displays project statistics and task counts
- Provides project creation dates and last activity
- Supports filtering and sorting options

**Parameters:**
- `includeStats` (optional): Include task count statistics (default: true)
- `sortBy` (optional): Sort order - "name", "created", "modified" (default: "name")
- `filterTags` (optional): Filter projects by specific tags

**Returns:**
- Complete list of all projects with metadata
- Current project indicator and status
- Project statistics including task counts
- Quick action suggestions for project management

**Project Information Includes:**
- Project ID and name
- Description and tags
- Creation and modification dates
- Task statistics (total, completed, pending)
- Project status (active, archived, etc.)

**Example:**
```
listProjects({
  includeStats: true,
  sortBy: "modified"
})
```
