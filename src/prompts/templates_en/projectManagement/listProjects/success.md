# 📋 Project List

Found **{{projectCount}}** project{{#unless (eq projectCount 1)}}s{{/unless}}{{#if currentProjectId}} (Current: {{currentProjectId}}){{/if}}

{{#if isMultiProject}}
🔄 **Multi-project mode active** - You can switch between projects
{{else}}
📁 **Single-project mode** - All tasks use the default project
{{/if}}

---

{{#each projects}}
## {{#if isCurrent}}🎯 {{else}}📁 {{/if}}{{name}}

**ID:** `{{id}}`  
**Status:** {{statusDisplay}}  
**Created:** {{formattedCreatedAt}}  
**Updated:** {{formattedUpdatedAt}}  
{{#if description}}**Description:** {{description}}{{/if}}

{{#if ../includeStats}}
### 📊 Statistics
- **Tasks:** {{taskSummary}}
- **Last Activity:** {{formattedLastActivity}}
{{/if}}

{{#if isCurrent}}
*This is your current active project*
{{/if}}

---
{{/each}}

{{#if (eq projectCount 0)}}
## 🔍 No Projects Found

No projects match your current filter criteria.

### Quick Actions
- **Create a project:** Use `createProject("My Project")`
- **Change filters:** Try different status or sorting options
{{/if}}

## 🛠️ Available Actions

- **Switch project:** `switchProject("project-name")`
- **Create project:** `createProject("New Project")`
- **Get project info:** `getProjectInfo("project-name")`
- **Delete project:** `deleteProject("project-name", true)`
