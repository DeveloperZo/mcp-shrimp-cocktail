// 任務狀態枚舉：定義任務在工作流程中的當前階段
export enum TaskStatus {
  PENDING = "pending", // 已創建但尚未開始執行的任務
  IN_PROGRESS = "in_progress", // 當前正在執行的任務
  COMPLETED = "completed", // 已成功完成並通過驗證的任務
  BLOCKED = "blocked", // 由於依賴關係而暫時無法執行的任務
}

// 任務依賴關係：定義任務之間的前置條件關係
export interface TaskDependency {
  taskId: string; // 前置任務的唯一標識符，當前任務執行前必須完成此依賴任務
}

// 相關文件類型：定義文件與任務的關係類型
export enum RelatedFileType {
  TO_MODIFY = "TO_MODIFY", // 需要在任務中修改的文件
  REFERENCE = "REFERENCE", // 任務的參考資料或相關文檔
  CREATE = "CREATE", // 需要在任務中建立的文件
  DEPENDENCY = "DEPENDENCY", // 任務依賴的組件或庫文件
  OTHER = "OTHER", // 其他類型的相關文件
}

// 相關文件：定義任務相關的文件信息
export interface RelatedFile {
  path: string; // 文件路徑，可以是相對於項目根目錄的路徑或絕對路徑
  type: RelatedFileType; // 文件與任務的關係類型
  description?: string; // 文件的補充描述，說明其與任務的具體關係或用途
  lineStart?: number; // 相關代碼區塊的起始行（選填）
  lineEnd?: number; // 相關代碼區塊的結束行（選填）
}

// 任務介面：定義任務的完整數據結構
export interface Task {
  id: string; // 任務的唯一標識符
  name: string; // 簡潔明確的任務名稱
  description: string; // 詳細的任務描述，包含實施要點和驗收標準
  notes?: string; // 補充說明、特殊處理要求或實施建議（選填）
  status: TaskStatus; // 任務當前的執行狀態
  dependencies: TaskDependency[]; // 任務的前置依賴關係列表
  createdAt: Date; // 任務創建的時間戳
  updatedAt: Date; // 任務最後更新的時間戳
  completedAt?: Date; // 任務完成的時間戳（僅適用於已完成的任務）
  summary?: string; // 任務完成摘要，簡潔描述實施結果和重要決策（僅適用於已完成的任務）
  relatedFiles?: RelatedFile[]; // 與任務相關的文件列表（選填）

  // 新增欄位：保存完整的技術分析結果
  analysisResult?: string; // 來自 analyze_task 和 reflect_task 階段的完整分析結果

  // 新增欄位：保存具體的實現指南
  implementationGuide?: string; // 具體的實現方法、步驟和建議

  // 新增欄位：保存驗證標準和檢驗方法
  verificationCriteria?: string; // 明確的驗證標準、測試要點和驗收條件

  /**
   * 項目ID：任務所屬的項目標識符
   * @description 用於多項目支持，null或undefined表示默認項目或向後兼容模式
   * @since 1.1.0
   */
  projectId?: string | null;
}

// 任務複雜度級別：定義任務的複雜程度分類
export enum TaskComplexityLevel {
  LOW = "低複雜度", // 簡單且直接的任務，通常不需要特殊處理
  MEDIUM = "中等複雜度", // 具有一定複雜性但仍可管理的任務
  HIGH = "高複雜度", // 複雜且耗時的任務，需要特別關注
  VERY_HIGH = "極高複雜度", // 極其複雜的任務，建議拆分處理
}

// 任務複雜度閾值：定義任務複雜度評估的參考標準
export const TaskComplexityThresholds = {
  DESCRIPTION_LENGTH: {
    MEDIUM: 500, // 超過此字數判定為中等複雜度
    HIGH: 1000, // 超過此字數判定為高複雜度
    VERY_HIGH: 2000, // 超過此字數判定為極高複雜度
  },
  DEPENDENCIES_COUNT: {
    MEDIUM: 2, // 超過此依賴數量判定為中等複雜度
    HIGH: 5, // 超過此依賴數量判定為高複雜度
    VERY_HIGH: 10, // 超過此依賴數量判定為極高複雜度
  },
  NOTES_LENGTH: {
    MEDIUM: 200, // 超過此字數判定為中等複雜度
    HIGH: 500, // 超過此字數判定為高複雜度
    VERY_HIGH: 1000, // 超過此字數判定為極高複雜度
  },
};

// 任務複雜度評估結果：記錄任務複雜度分析的詳細結果
/**
 * 任務複雜度評估結果：記錄任務複雜度分析的詳細結果
 */
export interface TaskComplexityAssessment {
  level: TaskComplexityLevel; // 整體複雜度級別
  metrics: {
    // 各項評估指標的詳細數據
    descriptionLength: number; // 描述長度
    dependenciesCount: number; // 依賴數量
    notesLength: number; // 注記長度
    hasNotes: boolean; // 是否有注記
  };
  recommendations: string[]; // 處理建議列表
}

// === PROJECT MANAGEMENT TYPES ===
// Added for multi-project support with backwards compatibility

/**
 * 項目狀態枚舉：定義項目在生命週期中的狀態
 */
export enum ProjectStatus {
  ACTIVE = "active", // 活躍項目，正在進行開發
  ARCHIVED = "archived", // 已歸檔項目，不再活躍但保留
  TEMPLATE = "template", // 模板項目，用於創建新項目
}

/**
 * 項目配置：定義項目特定的配置選項
 */
export interface ProjectConfig {
  /** 項目使用的模板語言 */
  templateLanguage?: string;
  /** 是否啟用自動備份 */
  autoBackup?: boolean;
  /** 項目特定的環境變量覆蓋 */
  envOverrides?: Record<string, string>;
  /** 項目特定的工具配置 */
  toolConfig?: Record<string, any>;
}

/**
 * 項目統計：記錄項目的使用統計信息
 */
export interface ProjectStats {
  /** 總任務數量 */
  totalTasks: number;
  /** 已完成任務數量 */
  completedTasks: number;
  /** 進行中任務數量 */
  activeTasks: number;
  /** 最後活動時間 */
  lastActivity: Date;
  /** 項目創建以來的總執行時間（毫秒） */
  totalExecutionTime?: number;
}

/**
 * 項目元數據：定義項目的基本信息和配置
 */
export interface ProjectMetadata {
  /** 項目的唯一標識符 */
  id: string;
  /** 項目顯示名稱 */
  name: string;
  /** 項目的文件系統安全名稱（用於文件夾名稱） */
  sanitizedName: string;
  /** 項目詳細描述 */
  description?: string;
  /** 項目當前狀態 */
  status: ProjectStatus;
  /** 項目創建時間 */
  createdAt: Date;
  /** 項目最後更新時間 */
  updatedAt: Date;
  /** 項目標籤列表，用於分類和搜索 */
  tags?: string[];
  /** 項目配置選項 */
  config?: ProjectConfig;
  /** 項目統計信息 */
  stats?: ProjectStats;
}

/**
 * 項目上下文：定義當前操作的項目環境
 */
export interface ProjectContext {
  /** 當前活躍的項目ID，null表示默認項目 */
  currentProjectId: string | null;
  /** 當前項目的元數據，null表示默認項目 */
  currentProject: ProjectMetadata | null;
  /** 所有可用項目的列表 */
  availableProjects: ProjectMetadata[];
  /** 是否為多項目模式 */
  isMultiProject: boolean;
  /** 數據目錄路徑 */
  dataDirectory: string;
  /** 當前項目的計劃上下文 */
  planContext?: PlanContext;
}

/**
 * 項目操作結果：定義項目操作的返回結果
 */
export interface ProjectOperationResult {
  /** 操作是否成功 */
  success: boolean;
  /** 錯誤信息（如果操作失敗） */
  error?: string;
  /** 操作返回的數據 */
  data?: any;
  /** 受影響的項目ID */
  projectId?: string;
}

/**
 * 項目創建選項：定義創建新項目時的配置選項
 */
export interface ProjectCreationOptions {
  /** 項目名稱 */
  name: string;
  /** 項目描述 */
  description?: string;
  /** 項目標籤 */
  tags?: string[];
  /** 是否從現有項目複製任務 */
  copyFromProject?: string;
  /** 是否從模板創建 */
  fromTemplate?: string;
  /** 初始項目配置 */
  config?: Partial<ProjectConfig>;
}

/**
 * 項目查詢選項：定義項目搜索和過濾的選項
 */
export interface ProjectQueryOptions {
  /** 項目狀態過濾 */
  status?: ProjectStatus;
  /** 標籤過濾 */
  tags?: string[];
  /** 名稱模糊搜索 */
  namePattern?: string;
  /** 排序方式 */
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'lastActivity';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
  /** 分頁限制 */
  limit?: number;
  /** 分頁偏移 */
  offset?: number;
}

/**
 * 項目備份信息：定義項目備份的結構
 */
export interface ProjectBackup {
  /** 備份唯一標識符 */
  id: string;
  /** 備份的項目ID */
  projectId: string;
  /** 備份創建時間 */
  createdAt: Date;
  /** 備份文件路徑 */
  filePath: string;
  /** 備份大小（字節） */
  size: number;
  /** 備份類型 */
  type: 'manual' | 'automatic' | 'migration';
  /** 備份描述 */
  description?: string;
}

/**
 * 任務過濾選項：擴展支持項目感知的任務查詢
 */
export interface TaskFilterOptions {
  /** 項目ID過濾 */
  projectId?: string | null;
  /** 任務狀態過濾 */
  status?: TaskStatus;
  /** 依賴關係過濾 */
  hasDependencies?: boolean;
  /** 名稱模糊搜索 */
  namePattern?: string;
  /** 創建時間範圍 */
  createdAfter?: Date;
  createdBefore?: Date;
  /** 排序選項 */
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// === BACKWARDS COMPATIBILITY TYPES ===

/**
 * 向後兼容性類型別名
 * @deprecated 建議使用完整的項目感知API
 */
export type LegacyTask = Omit<Task, 'projectId'>;

/**
 * 項目感知的任務接口
 * @description 確保任務具有有效的項目ID的強類型版本
 */
export interface ProjectTask extends Task {
  projectId: string;
}

// === PLAN MANAGEMENT TYPES ===
// Added for multiple plans per project support

/**
 * 計劃狀態枚舉：定義計劃在生命週期中的狀態
 */
export enum PlanStatus {
  ACTIVE = "active", // 活躍計劃，正在執行中
  COMPLETED = "completed", // 已完成的計劃
  ARCHIVED = "archived", // 已歸檔的計劃，保留但不活躍
  TEMPLATE = "template", // 模板計劃，用於創建新計劃
}

/**
 * 計劃統計：記錄計劃的任務統計信息
 */
export interface PlanStats {
  /** 總任務數量 */
  totalTasks: number;
  /** 已完成任務數量 */
  completedTasks: number;
  /** 進行中任務數量 */
  activeTasks: number;
  /** 待處理任務數量 */
  pendingTasks: number;
  /** 阻塞的任務數量 */
  blockedTasks: number;
  /** 完成率（百分比） */
  completionRate: number;
  /** 最後活動時間 */
  lastActivity?: Date;
}

/**
 * 計劃元數據：定義計劃的基本信息和配置
 */
export interface PlanMetadata {
  /** 計劃的唯一標識符 */
  id: string;
  /** 計劃顯示名稱 */
  name: string;
  /** 計劃的文件系統安全名稱（用於文件夾名稱） */
  sanitizedName: string;
  /** 計劃詳細描述 */
  description?: string;
  /** 計劃當前狀態 */
  status: PlanStatus;
  /** 所屬項目ID */
  projectId: string;
  /** 父計劃ID（用於計劃層級結構，可選） */
  parentPlanId?: string;
  /** 計劃創建時間 */
  createdAt: Date;
  /** 計劃最後更新時間 */
  updatedAt: Date;
  /** 計劃標籤列表，用於分類和搜索 */
  tags?: string[];
  /** 計劃統計信息 */
  stats?: PlanStats;
}

/**
 * 計劃上下文：定義當前操作的計劃環境
 */
export interface PlanContext {
  /** 當前活躍的計劃ID */
  currentPlanId: string;
  /** 當前計劃的元數據 */
  currentPlan: PlanMetadata;
  /** 當前項目下所有可用計劃的列表 */
  availablePlans: PlanMetadata[];
  /** 計劃數據目錄路徑 */
  planDirectory: string;
}

/**
 * 計劃操作結果：定義計劃操作的返回結果
 */
export interface PlanOperationResult {
  /** 操作是否成功 */
  success: boolean;
  /** 錯誤信息（如果操作失敗） */
  error?: string;
  /** 操作返回的數據 */
  data?: any;
  /** 受影響的計劃ID */
  planId?: string;
  /** 受影響的項目ID */
  projectId?: string;
}

/**
 * 計劃創建選項：定義創建新計劃時的配置選項
 */
export interface PlanCreationOptions {
  /** 計劃名稱 */
  name: string;
  /** 計劃描述 */
  description?: string;
  /** 計劃標籤 */
  tags?: string[];
  /** 是否從現有計劃複製任務 */
  copyFromPlan?: string;
  /** 是否從模板創建 */
  fromTemplate?: string;
  /** 父計劃ID（用於創建子計劃） */
  parentPlanId?: string;
}

// === PROJECT RESOLUTION TYPES ===
// Added for centralized project resolution functionality

/**
 * Project resolution result containing the resolved project and resolution metadata
 */
export interface ProjectResolutionResult {
  /** Whether the resolution was successful */
  success: boolean;
  /** The resolved project metadata (null if not found) */
  project: ProjectMetadata | null;
  /** The project ID that was resolved */
  resolvedId: string | null;
  /** How the project was matched (id, name, sanitizedName, or default) */
  matchedBy: 'id' | 'name' | 'sanitizedName' | 'default' | null;
  /** Error message if resolution failed */
  error?: string;
  /** Suggested projects if resolution failed */
  suggestions?: string[];
}

/**
 * Project validation result for project name format validation
 */
export interface ProjectValidationResult {
  /** Whether the project identifier is valid */
  isValid: boolean;
  /** Validation errors if any */
  errors: string[];
  /** The sanitized version of the project name */
  sanitizedName?: string;
  /** Whether the identifier appears to be a UUID */
  isUuid: boolean;
  /** Whether the identifier appears to be a project name */
  isProjectName: boolean;
}

/**
 * Options for project resolution behavior
 */
export interface ProjectResolutionOptions {
  /** Whether to fall back to default project if resolution fails */
  allowDefaultFallback?: boolean;
  /** Whether to include case-insensitive matching */
  caseInsensitive?: boolean;
  /** Whether to suggest similar project names on failure */
  includeSuggestions?: boolean;
  /** Maximum number of suggestions to provide */
  maxSuggestions?: number;
}

// Re-export MCP-specific types
export * from './mcp.js';
