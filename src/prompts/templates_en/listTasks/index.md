# Task Management Dashboard

*Working in: {projectContext}*

## Project Information

- **Current Project:** {currentProject}
- **Project Status:** {projectStatus}
- **Last Updated:** {projectLastUpdated}

## Task Status Overview

{statusCount}

{taskDetailsTemplate}

## Project Context

- **Total Tasks in Project:** {totalProjectTasks}
- **Active Tasks:** {activeTasks}
- **Completed Tasks:** {completedTasks}
- **Pending Tasks:** {pendingTasks}

## Quick Actions

- Add new task to {currentProject}: `planTask("task description")`
- Switch to different project: `switchProject("projectName")`
- View project info: `getProjectInfo("{currentProject}")`
