# 📋 專案計畫列表：{{projectName}}

**計畫總數：** {{planCount}}  
**當前計畫：** {{currentPlanId}}

{{#if isMultiPlan}}
## 計畫列表

| 計畫名稱 | 狀態 | 任務 | 創建時間 | 最後活動 |
|---------|------|------|---------|----------|
{{#each plans}}
| {{#if isCurrent}}**→ {{name}}**{{else}}{{name}}{{/if}} | {{statusDisplay}} | {{taskSummary}} | {{formattedCreatedAt}} | {{formattedLastActivity}} |
{{/each}}

## 圖例
- **→** 表示當前活動計畫
- 任務計數顯示已完成/總數和活動任務

{{else}}
## 單一計畫專案

此專案只有一個計畫：

**計畫：** {{plans.[0].name}}  
**狀態：** {{plans.[0].statusDisplay}}  
**任務：** {{plans.[0].taskSummary}}  
**創建時間：** {{plans.[0].formattedCreatedAt}}  
**最後活動：** {{plans.[0].formattedLastActivity}}

{{/if}}

## 快速操作

- 切換計畫：`switch_plan projectName="{{projectName}}" planName="<計畫名稱>"`
- 創建新計畫：`create_plan projectName="{{projectName}}" name="新計畫" description="計畫描述"`
- 獲取計畫詳情：`get_plan_info projectName="{{projectName}}" planName="<計畫名稱>"`
- 刪除計畫：`delete_plan projectName="{{projectName}}" planName="<計畫名稱>" confirm=true`

{{#unless includeStats}}
*注意：未包含任務統計。使用 `includeStats=true` 查看詳細計數。*
{{/unless}}
