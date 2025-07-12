向項目添加單個任務。此工具允許您快速添加個別任務，無需進行完整的規劃工作流程。

**使用此工具的情況：**
- 您想要向現有項目快速添加任務
- 開發過程中出現新的需求
- 您需要添加獨立任務而無需複雜規劃
- 您想要添加具有特定實現詳情的任務

**參數：**
- `name`：任務名稱（1-100個字符）
- `description`：詳細任務描述（最少10個字符）
- `notes`：可選的附加備註或特殊要求
- `dependencies`：可選的此任務依賴的任務ID數組
- `relatedFiles`：可選的與此任務相關的文件數組
- `implementationGuide`：可選的逐步實現指南
- `verificationCriteria`：可選的任務完成驗證標準

**使用示例：**
```json
{
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

此工具與現有任務管理工作流程無縫集成，創建的任務與所有其他任務管理工具兼容。
