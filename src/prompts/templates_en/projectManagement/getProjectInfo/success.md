# 📋 Project Information

{{#if isCurrent}}
## 🎯 Current Project
{{else}}
## 📁 Project Details
{{/if}}

**Name:** {{project.name}}  
**ID:** `{{project.id}}`  
**Status:** {{project.statusDisplay}}

## Description

{{#if project.description}}
{{project.description}}
{{else}}
*No description provided*
{{/if}}

## Project Metadata

- **Created:** {{project.formattedCreatedAt}}
- **Last Updated:** {{project.formattedUpdatedAt}}  
- **Last Activity:** {{project.formattedLastActivity}}
- **Tags:** {{project.tagsDisplay}}

{{#if project.stats}}
## 📊 Task Statistics

- **Total Tasks:** {{project.stats.totalTasks}}
- **Completed Tasks:** {{project.stats.completedTasks}}
- **Active Tasks:** {{project.stats.activeTasks}}
- **Pending Tasks:** {{subtract project.stats.totalTasks (add project.stats.completedTasks project.stats.activeTasks)}}

### Progress Overview

{{#if (gt project.stats.totalTasks 0)}}
**Completion Rate:** {{multiply (divide project.stats.completedTasks project.stats.totalTasks) 100}}%

{{#if (gt project.stats.completedTasks 0)}}✅{{/if}}{{#if (gt project.stats.activeTasks 0)}}🔄{{/if}}{{#if (gt (subtract project.stats.totalTasks (add project.stats.completedTasks project.stats.activeTasks)) 0)}}⏳{{/if}}
{{else}}
*No tasks in this project yet*
{{/if}}
{{/if}}

## ⚙️ Configuration

- **Template Language:** {{project.configDisplay.templateLanguage}}
- **Auto Backup:** {{project.configDisplay.autoBackup}}

{{#if isCurrent}}
## 🚀 Quick Actions

Since this is your current project:

- **List tasks:** `list_tasks("all")`
- **Create task:** `split_tasks()` 
- **Add task:** Use task management tools
- **Switch project:** `switchProject("other-project")`
{{else}}
## 🔄 Available Actions

- **Switch to this project:** `switchProject("{{project.name}}")`
- **View project tasks:** Switch first, then use task tools
- **Delete project:** `deleteProject("{{project.name}}", true)` ⚠️
{{/if}}

---

{{#if isCurrent}}
*You are currently working in this project. All task operations will use this project.*
{{else}}
*Use `switchProject("{{project.name}}")` to make this your active project.*
{{/if}}
