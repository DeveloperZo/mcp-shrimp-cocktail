# 📋 項目列表

找到 **{{projectCount}}** 個項目{{#if currentProjectId}}（當前：{{currentProjectId}}）{{/if}}

{{#if isMultiProject}}
🔄 **多項目模式啟用** - 您可以在項目之間切換
{{else}}
📁 **單項目模式** - 所有任務使用默認項目
{{/if}}

---

{{#each projects}}
## {{#if isCurrent}}🎯 {{else}}📁 {{/if}}{{name}}

**ID：** `{{id}}`  
**狀態：** {{statusDisplay}}  
**創建時間：** {{formattedCreatedAt}}  
**更新時間：** {{formattedUpdatedAt}}  
{{#if description}}**描述：** {{description}}{{/if}}

{{#if ../includeStats}}
### 📊 統計信息
- **任務：** {{taskSummary}}
- **最後活動：** {{formattedLastActivity}}
{{/if}}

{{#if isCurrent}}
*這是您當前的活躍項目*
{{/if}}

---
{{/each}}

{{#if (eq projectCount 0)}}
## 🔍 未找到項目

沒有項目符合您當前的篩選條件。

### 快速操作
- **創建項目：** 使用 `createProject("我的項目")`
- **更改篩選器：** 嘗試不同的狀態或排序選項
{{/if}}

## 🛠️ 可用操作

- **切換項目：** `switchProject("項目名稱")`
- **創建項目：** `createProject("新項目")`
- **獲取項目信息：** `getProjectInfo("項目名稱")`
- **刪除項目：** `deleteProject("項目名稱", true)`