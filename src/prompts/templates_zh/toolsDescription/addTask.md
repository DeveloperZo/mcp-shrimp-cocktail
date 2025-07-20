向項目中現有計畫添加單個任務。此工具允許您快速向已經具有某些結構或任務的計畫中添加個別任務。

## 何時使用 add_task 與 create_plan

**使用 `add_task` 的情況：**
- 向已經包含任務的現有計畫添加增量任務
- 在活躍計畫的開發過程中出現新需求
- 您需要向已填充的計畫添加獨立任務
- 您想要向現有工作流程添加具有特定實現詳情的任務
- 計畫已經有既定結構，您正在擴展它

**使用 `create_plan` 的情況：**
- 為新項目階段或功能開始全新規劃
- 處理需要初始任務結構的空計畫
- 您需要全面的任務規劃和分解
- 為項目計畫設置初始工作流程
- 您想要從頭組織多個相關任務

**重要提示：** 對於空計畫或初始規劃，始終先使用 `create_plan` 建立任務結構，然後使用 `add_task` 進行增量添加。

**參數：**
- `projectName`：應添加任務的項目名稱或ID（多項目架構所需）
- `name`：任務名稱（1-100個字符）
- `description`：詳細任務描述（最少10個字符）
- `notes`：可選的附加備註或特殊要求
- `dependencies`：可選的此任務依賴的任務ID數組（同一計畫內）
- `relatedFiles`：可選的與此任務相關的文件數組
- `implementationGuide`：可選的逐步實現指南
- `verificationCriteria`：可選的任務完成驗證標準

**使用示例：**
```json
{
  "projectName": "WebApp Development",
  "name": "添加用戶認證",
  "description": "實現基於JWT的用戶認證系統，包含登錄/登出功能",
  "notes": "使用bcrypt進行密碼哈希，實現速率限制",
  "dependencies": ["create-user-model-task-id"],
  "relatedFiles": [
    {
      "path": "src/auth/auth.service.ts",
      "type": "CREATE",
      "description": "主要認證服務"
    }
  ],
  "implementationGuide": "1. 安裝jwt庫 2. 創建認證服務 3. 添加中間件 4. 編寫測試",
  "verificationCriteria": "用戶可以成功登錄/登出，密碼已哈希，速率限制正常工作"
}
```

## 與多項目架構的集成

此工具與多項目任務管理工作流程無縫集成：
- 任務會添加到指定項目內當前活躍的計畫中
- 依賴關係在同一計畫環境中解析
- 創建的任務與所有其他任務管理工具兼容
- 支持項目特定的工作流程和計畫組織
