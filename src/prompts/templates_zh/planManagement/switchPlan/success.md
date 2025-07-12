# ✅ 計畫切換成功

**專案：** {{projectName}}

## 計畫切換摘要

| | 之前的計畫 | 新計畫 |
|---|-----------|--------|
| **名稱** | {{previousPlanName}} | **→ {{newPlanName}}** |
| **ID** | {{previousPlanId}} | {{newPlanId}} |
| **任務** | - | {{taskCount}} 個任務 |

## 這意味著什麼

所有任務操作現在都將在 **{{newPlanName}}** 計畫內進行：

- 新任務將在此計畫中創建
- 任務列表將顯示此計畫的任務
- 任務操作只會影響此計畫的任務

## 下一步

- 查看此計畫中的任務：`list_tasks projectName="{{projectName}}" status="all"`
- 添加新任務：`add_task projectName="{{projectName}}" name="任務名稱" description="描述"`
- 查看計畫詳情：`get_plan_info projectName="{{projectName}}" planName="{{newPlanName}}"`

計畫上下文已成功更新。
