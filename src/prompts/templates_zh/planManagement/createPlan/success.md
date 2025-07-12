# ✅ 計畫創建成功

**計畫名稱：** {{planName}}  
**計畫 ID：** {{planId}}  
**所屬專案：** {{projectName}}

## 計畫詳情

- **描述：** {{description}}
- **標籤：** {{tags}}
{{#if copyFromPlan}}
- **複製自：** {{copyFromPlan}}
{{/if}}

## 下一步操作

1. 使用 `switch_plan` 切換到此計畫：
   ```
   switch_plan projectName="{{projectName}}" planName="{{planName}}"
   ```

2. 為計畫添加任務：
   ```
   add_task projectName="{{projectName}}" name="任務名稱" description="任務描述"
   ```

3. 查看專案中的所有計畫：
   ```
   list_plans projectName="{{projectName}}"
   ```

計畫已創建完成，可以開始使用。在此計畫處於活動狀態時創建的所有任務都將組織在其中。
