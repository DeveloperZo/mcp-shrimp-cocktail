// 全局變量
let tasks = [];
let projects = []; // 新增：儲存項目列表
let plans = []; // 新增：儲存計劃列表
let currentProject = 'default'; // 新增：當前選中的項目
let currentPlan = 'default'; // 新增：當前選中的計劃
let selectedTaskId = null;
let searchTerm = "";
let sortOption = "date-asc";
let globalAnalysisResult = null; // 新增：儲存全局分析結果
let svg, g, simulation;
let width, height; // << 新增：將寬高定義為全局變量
let isGraphInitialized = false; // << 新增：追蹤圖表是否已初始化
let zoom; // << 新增：保存縮放行為對象

// 新增：i18n 全局變量
let currentLang = "en"; // 預設語言
let translations = {}; // 儲存加載的翻譯

// DOM元素
const taskListElement = document.getElementById("task-list");
const taskDetailsContent = document.getElementById("task-details-content");
const statusFilter = document.getElementById("status-filter");
const projectSelector = document.getElementById("project-selector"); // 新增：項目選擇器
const planSelector = document.getElementById("plan-selector"); // 新增：計劃選擇器
const currentTimeElement = document.getElementById("current-time");
const progressIndicator = document.getElementById("progress-indicator");
const progressCompleted = document.getElementById("progress-completed");
const progressInProgress = document.getElementById("progress-in-progress");
const progressPending = document.getElementById("progress-pending");
const progressLabels = document.getElementById("progress-labels");
const dependencyGraphElement = document.getElementById("dependency-graph");
const globalAnalysisResultElement = document.getElementById(
  "global-analysis-result"
); // 假設 HTML 中有這個元素
const langSwitcher = document.getElementById("lang-switcher"); // << 新增：獲取切換器元素
const resetViewBtn = document.getElementById("reset-view-btn"); // << 新增：獲取重置按鈕元素
const setActivePlanBtn = document.getElementById("set-active-plan-btn"); // 新增：獲取設置活躍計劃按鈕
const deletePlanBtn = document.getElementById("delete-plan-btn"); // 新增：獲取刪除計劃按鈕
const planHeaderElement = document.getElementById("plan-header"); // 新增：獲取計劃標題元素
const planNameElement = document.getElementById("plan-name"); // 新增：獲取計劃名稱元素
const planIdElement = document.getElementById("plan-id"); // 新增：獲取計劃ID元素

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  // fetchTasks(); // 將由 initI18n() 觸發
  initI18n(); // << 新增：初始化 i18n
  updateCurrentTime();
  setInterval(updateCurrentTime, 1000);
  updateDimensions(); // << 新增：初始化時更新尺寸

  // 事件監聽器
  // statusFilter.addEventListener("change", renderTasks); // 將由 changeLanguage 觸發或在 applyTranslations 後觸發
  if (statusFilter) {
    statusFilter.addEventListener("change", renderTasks);
  }

  // 新增：項目選擇器事件監聽
  if (projectSelector) {
    projectSelector.addEventListener("change", async (e) => {
      currentProject = e.target.value;
      await fetchPlans(); // 當項目改變時重新獲取計劃
      fetchTasks(); // 重新獲取選中項目的任務
    });
  }

  // 新增：計劃選擇器事件監聽
  if (planSelector) {
    planSelector.addEventListener("change", (e) => {
      currentPlan = e.target.value;
      updateSetActivePlanButton(); // 更新按鈕狀態
      updatePlanHeader(); // 更新計劃標題顯示
      fetchTasks(); // 重新獲取選中計劃的任務
    });
  }

  // 新增：重置視圖按鈕事件監聽
  if (resetViewBtn) {
    resetViewBtn.addEventListener("click", resetView);
  }

  // 新增：設置活躍計劃按鈕事件監聽
  if (setActivePlanBtn) {
    setActivePlanBtn.addEventListener("click", setActivePlan);
  }

  // 新增：刪除計劃按鈕事件監聽
  if (deletePlanBtn) {
    deletePlanBtn.addEventListener("click", deletePlan);
  }

  // 新增：搜索和排序事件監聽
  const searchInput = document.getElementById("search-input");
  const sortOptions = document.getElementById("sort-options");

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchTerm = e.target.value.toLowerCase();
      renderTasks();
    });
  }

  if (sortOptions) {
    sortOptions.addEventListener("change", (e) => {
      sortOption = e.target.value;
      renderTasks();
    });
  }

  // 新增：設置 SSE 連接
  setupSSE();

  // 新增：語言切換器事件監聽
  if (langSwitcher) {
    langSwitcher.addEventListener("change", (e) =>
      changeLanguage(e.target.value)
    );
  }

  // 新增：視窗大小改變時更新尺寸
  window.addEventListener("resize", () => {
    updateDimensions();
    if (svg && simulation) {
      svg.attr("viewBox", [0, 0, width, height]);
      simulation.force("center", d3.forceCenter(width / 2, height / 2));
      simulation.alpha(0.3).restart();
    }
  });
});

// 新增：i18n 核心函數
// 1. 語言檢測 (URL 參數 > navigator.language > 'en')
function detectLanguage() {
  // 1. 優先從 URL 參數讀取
  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get("lang");
  if (urlLang && ["en", "zh-TW"].includes(urlLang)) {
    return urlLang;
  }

  // 2. 檢查瀏覽器語言（移除 localStorage 檢查）
  const browserLang = navigator.language || navigator.userLanguage;
  if (browserLang) {
    if (browserLang.toLowerCase().startsWith("zh-tw")) return "zh-TW";
    if (browserLang.toLowerCase().startsWith("zh")) return "zh-TW"; // 簡體也先 fallback 到繁體
    if (browserLang.toLowerCase().startsWith("en")) return "en";
  }

  // 3. 預設值
  return "en";
}

// 2. 異步加載翻譯文件
async function loadTranslations(lang) {
  try {
    const response = await fetch(`/locales/${lang}.json`);
    if (!response.ok) {
      throw new Error(
        `Failed to load ${lang}.json, status: ${response.status}`
      );
    }
    translations = await response.json();
    console.log(`Translations loaded for ${lang}`);
  } catch (error) {
    console.error("Error loading translations:", error);
    if (lang !== "en") {
      console.warn(`Falling back to English translations.`);
      await loadTranslations("en"); // Fallback to English
    } else {
      translations = {}; // Clear translations if even English fails
      // Maybe display a more persistent error message?
      alert("Critical error: Could not load language files.");
    }
  }
}

// 3. 翻譯函數
function translate(key, replacements = {}) {
  let translated = translations[key] || key; // Fallback to key itself
  // 簡單的佔位符替換（例如 {message}）
  for (const placeholder in replacements) {
    translated = translated.replace(
      `{${placeholder}}`,
      replacements[placeholder]
    );
  }
  return translated;
}

// 4. 應用翻譯到 DOM (處理 textContent, placeholder, title)
function applyTranslations() {
  console.log("Applying translations for:", currentLang);
  document.querySelectorAll("[data-i18n-key]").forEach((el) => {
    const key = el.dataset.i18nKey;
    const translatedText = translate(key);

    // 優先處理特定屬性
    if (el.hasAttribute("placeholder")) {
      el.placeholder = translatedText;
    } else if (el.hasAttribute("title")) {
      el.title = translatedText;
    } else if (el.tagName === "OPTION") {
      el.textContent = translatedText;
      // 如果需要，也可以翻譯 value，但通常不需要
    } else {
      // 對於大多數元素，設置 textContent
      el.textContent = translatedText;
    }
  });
  // 手動更新沒有 data-key 的元素（如果有的話）
  // 例如，如果 footer 時間格式需要本地化，可以在這裡處理
  // updateCurrentTime(); // 確保時間格式也可能更新（如果需要）
}

// 5. 初始化 i18n
async function initI18n() {
  currentLang = detectLanguage();
  console.log(`Initializing i18n with language: ${currentLang}`);
  // << 新增：設置切換器的初始值 >>
  if (langSwitcher) {
    langSwitcher.value = currentLang;
  }
  await loadTranslations(currentLang);
  applyTranslations();
  // 首先獲取項目列表，然後獲取計劃，最後獲取任務
  await fetchProjects();
  await fetchPlans();
  await fetchTasks();
}

// 新增：語言切換函數
function changeLanguage(lang) {
  if (!lang || !["en", "zh-TW"].includes(lang)) {
    console.warn(`Invalid language selected: ${lang}. Defaulting to English.`);
    lang = "en";
  }
  currentLang = lang;
  console.log(`Changing language to: ${currentLang}`);
  loadTranslations(currentLang)
    .then(async () => {
      console.log("Translations reloaded, applying...");
      applyTranslations();
      console.log("Re-rendering components...");
      // 重新渲染需要翻譯的組件
      renderTasks();
      if (selectedTaskId) {
        const task = tasks.find((t) => t.id === selectedTaskId);
        if (task) {
          selectTask(selectedTaskId); // 確保傳遞 ID，讓 selectTask 重新查找並渲染
        } else {
          // 如果選中的任務已不存在，清除詳情
          taskDetailsContent.innerHTML = `<p class="placeholder">${translate(
            "task_details_placeholder"
          )}</p>`;
          selectedTaskId = null;
          highlightNode(null);
        }
      } else {
        // 如果沒有任務被選中，確保詳情面板顯示 placeholder
        taskDetailsContent.innerHTML = `<p class="placeholder">${translate(
          "task_details_placeholder"
        )}</p>`;
      }
      renderDependencyGraph(); // 重新渲染圖表（可能包含 placeholder）
      updateProgressIndicator(); // 重新渲染進度條（包含標籤）
      renderGlobalAnalysisResult(); // 重新渲染全局分析（標題）
      await fetchProjects(); // 重新獲取並渲染項目選擇器
      await fetchPlans(); // 重新獲取並渲染計劃選擇器
      updatePlanHeader(); // 重新渲染計劃標題
      // 確保下拉菜單的值與當前語言一致
      if (langSwitcher) langSwitcher.value = currentLang;
      console.log("Language change complete.");
    })
    .catch((error) => {
      console.error("Error changing language:", error);
      // 可以添加用戶反饋，例如顯示錯誤消息
      showTemporaryError("Failed to change language. Please try again."); // Need translation key
    });
}
// --- i18n 核心函數結束 ---

// 新增：獲取項目列表
async function fetchProjects() {
  try {
    const response = await fetch("/api/projects");
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    projects = data.projects || [];
    
    renderProjectSelector();
    
  } catch (error) {
    console.error("Error fetching projects:", error);
    // 如果獲取項目失敗，設置默認項目
    projects = [{ id: 'default', name: 'Default Project' }];
    renderProjectSelector();
  }
}

// 新增：渲染項目選擇器
function renderProjectSelector() {
  if (!projectSelector) return;
  
  // 清空現有選項
  projectSelector.innerHTML = '';
  
  // 添加默認選項
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = translate('project_selector_placeholder') || 'Select a project...';
  projectSelector.appendChild(defaultOption);
  
  // 添加項目選項
  projects.forEach(project => {
    const option = document.createElement('option');
    option.value = project.id;
    option.textContent = project.name;
    if (project.id === currentProject) {
      option.selected = true;
    }
    projectSelector.appendChild(option);
  });
  
  // 如果沒有選中的項目且有項目存在，選中第一個
  if (!currentProject && projects.length > 0) {
    currentProject = projects[0].id;
    projectSelector.value = currentProject;
  }
}

// 新增：獲取計劃列表
async function fetchPlans() {
  try {
    if (!currentProject) {
      plans = [];
      renderPlanSelector();
      return;
    }

    const response = await fetch(`/api/plans?project=${encodeURIComponent(currentProject)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    plans = data.plans || [];
    
    renderPlanSelector();
    
  } catch (error) {
    console.error("Error fetching plans:", error);
    // 如果獲取計劃失敗，設置默認計劃
    plans = [{ id: 'default', name: 'Default Plan' }];
    renderPlanSelector();
  }
}

// 新增：渲染計劃選擇器
function renderPlanSelector() {
  if (!planSelector) return;
  
  // 清空現有選項
  planSelector.innerHTML = '';
  
  // 添加默認選項
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = translate('plan_selector_placeholder') || 'Select a plan...';
  planSelector.appendChild(defaultOption);
  
  // 添加計劃選項（包含活躍計劃指示器）
  plans.forEach(plan => {
    const option = document.createElement('option');
    option.value = plan.id;
    
    // 檢查是否為活躍計劃（基於服務器返回的 current 標記）
    const isActivePlan = plan.current === true;
    
    // 為活躍計劃添加視覺指示器
    if (isActivePlan) {
      option.textContent = `★ ${plan.name}`; // 星號指示器
      option.style.fontWeight = 'bold';
      option.style.color = '#4cd137'; // 使用主題色彩
    } else {
      option.textContent = plan.name;
    }
    
    if (plan.id === currentPlan) {
      option.selected = true;
    }
    planSelector.appendChild(option);
  });
  
  // 如果沒有選中的計劃且有計劃存在，選中第一個
  if (!currentPlan && plans.length > 0) {
    currentPlan = plans[0].id;
    planSelector.value = currentPlan;
  }
  
  // 更新設置活躍計劃按鈕狀態
  updateSetActivePlanButton();
  
  // 更新刪除計劃按鈕狀態
  updateDeletePlanButton();
  
  // 更新計劃標題顯示
  updatePlanHeader();
}

// 新增：同步計劃選擇器狀態與當前活躍計劃
function syncPlanSelector() {
  if (!planSelector || !currentPlan) return;
  
  // 確保計劃選擇器選中正確的計劃
  if (planSelector.value !== currentPlan) {
    planSelector.value = currentPlan;
    console.log(`Plan selector synchronized to: ${currentPlan}`);
  }
  
  // 觸發按鈕狀態更新
  updateSetActivePlanButton();
  updateDeletePlanButton();
  
  // 更新計劃標題顯示
  updatePlanHeader();
}

// 獲取任務數據
async function fetchTasks() {
  try {
    // 初始載入時顯示 loading (現在使用翻譯)
    if (tasks.length === 0) {
      taskListElement.innerHTML = `<div class="loading">${translate(
        "task_list_loading"
      )}</div>`;
    }

    // 根據當前選中的項目和計劃獲取任務
    let url = '/api/tasks';
    const params = new URLSearchParams();
    if (currentProject) {
      params.append('project', currentProject);
    }
    if (currentPlan) {
      params.append('plan', currentPlan);
    }
    if (params.toString()) {
      url += '?' + params.toString();
    }
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    const newTasks = data.tasks || [];

    // 提取全局分析結果 (找第一個非空的)
    let foundAnalysisResult = null;
    for (const task of newTasks) {
      if (task.analysisResult) {
        foundAnalysisResult = task.analysisResult;
        break; // 找到一個就夠了
      }
    }
    // 只有當找到的結果與當前儲存的不同時才更新
    if (foundAnalysisResult !== globalAnalysisResult) {
      globalAnalysisResult = foundAnalysisResult;
      renderGlobalAnalysisResult(); // 更新顯示
    }

    // --- 智慧更新邏輯 (初步 - 仍需改進以避免閃爍) ---
    // 簡單地比較任務數量或標識符來決定是否重新渲染
    // 理想情況下應比較每個任務的內容並進行 DOM 更新
    const tasksChanged = didTasksChange(tasks, newTasks);

    if (tasksChanged) {
      tasks = newTasks; // 更新全局任務列表
      console.log("Tasks updated via fetch, re-rendering...");
      renderTasks();
      updateProgressIndicator();
      renderDependencyGraph(); // 更新圖表
    } else {
      console.log(
        "No significant task changes detected, skipping full re-render."
      );
      // 如果不需要重新渲染列表，可能只需要更新進度條
      updateProgressIndicator();
      // 考慮是否需要更新圖表（如果狀態可能改變）
      // renderDependencyGraph(); // 暫時註釋掉，除非狀態變化很關鍵
    }

    // *** 移除 setTimeout 輪詢 ***
    // setTimeout(fetchTasks, 30000);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    // 避免覆蓋現有列表，除非是初始載入失敗
    if (tasks.length === 0) {
      taskListElement.innerHTML = `<div class="error">${translate(
        "error_loading_tasks",
        { message: error.message }
      )}</div>`;
      if (progressIndicator) progressIndicator.style.display = "none";
      if (dependencyGraphElement)
        dependencyGraphElement.innerHTML = `<div class="error">${translate(
          "error_loading_graph"
        )}</div>`;
    } else {
      showTemporaryError(
        translate("error_updating_tasks", { message: error.message })
      );
    }
  }
}

// 新增：設置 Server-Sent Events 連接 - 增強為完全項目感知更新
let sseReconnectAttempts = 0;
const maxReconnectAttempts = 5;
let sseReconnectTimeout = null;

function setupSSE() {
  console.log("Setting up SSE connection to /api/tasks/stream");
  const evtSource = new EventSource("/api/tasks/stream");

  evtSource.onmessage = function (event) {
    console.log("SSE message received:", event.data);
    // 可以根據 event.data 內容做更複雜的判斷，目前只要收到消息就更新
  };

  evtSource.addEventListener("update", async function (event) {
    console.log("SSE 'update' event received:", event.data);
    
    try {
      // 修復 JSON 解析錯誤：檢查 event.data 是否為字符串
      let updateData;
      if (typeof event.data === 'string') {
        updateData = JSON.parse(event.data);
      } else if (typeof event.data === 'object' && event.data !== null) {
        updateData = event.data;
      } else {
        throw new Error('Invalid event data type');
      }
      
      const { updateType, projectId, action, data } = updateData;
      
      console.log(`SSE update - Type: ${updateType}, Project: ${projectId}, Action: ${action}`);
      
      // 處理不同類型的更新
      switch (updateType) {
        case 'projects':
          // 項目列表更新 - 總是重新獲取項目列表
          console.log(`Project list ${action}, refreshing projects`);
          await fetchProjects();
          await fetchPlans(); // 項目更新時也更新計劃
          break;
          
        case 'plans':
          // 計劃列表更新 - 只有當前項目相關才處理
          if (projectId && projectId !== currentProject) {
            console.log(`Plan update for different project (${projectId}), ignoring`);
            return;
          }
          console.log('Plan update relevant to current project, refreshing plans');
          
          // 特別處理活躍計劃切換事件
          if (action === 'updated' && data && data.newActivePlan) {
            console.log(`Active plan changed to: ${data.newActivePlan}`);
            // 重新獲取計劃列表以反映活躍狀態變化
            await fetchPlans();
            // 重新獲取任務列表以反映新的活躍計劃
            fetchTasks();
            // 顯示通知
            if (data.message) {
              const notification = document.createElement('div');
              notification.className = 'copy-notification';
              notification.textContent = data.message;
              document.body.appendChild(notification);
              setTimeout(() => {
                notification.remove();
              }, 3000);
            }
          } else {
            // 正常的計劃列表更新
            await fetchPlans();
          }
          break;
          
        case 'tasks':
          // 任務更新 - 只有當前項目相關才處理
          if (projectId && projectId !== currentProject) {
            console.log(`Task update for different project (${projectId}), ignoring`);
            return;
          }
          console.log('Task update relevant to current project, refreshing tasks');
          fetchTasks();
          break;
          
        case 'both':
          // 同時更新項目和任務
          console.log('Both projects and tasks updated, refreshing both');
          await fetchProjects();
          await fetchPlans();
          // 只有當相關項目時才更新任務
          if (!projectId || projectId === currentProject) {
            fetchTasks();
          }
          break;
          
        default:
          // 未知更新類型，保守處理
          console.log('Unknown update type, refreshing tasks only');
          fetchTasks();
      }
      
    } catch (parseError) {
      console.log('SSE update data not JSON, refreshing tasks as fallback');
      fetchTasks();
    }
  });

  evtSource.onerror = function (err) {
    console.error("EventSource failed:", err);
    evtSource.close(); // 關閉錯誤的連接
    
    // 增強的重連邏輯
    if (sseReconnectAttempts < maxReconnectAttempts) {
      sseReconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, sseReconnectAttempts), 30000); // 指數回退，最多30秒
      
      console.log(`SSE reconnection attempt ${sseReconnectAttempts}/${maxReconnectAttempts} in ${delay}ms`);
      
      if (sseReconnectTimeout) {
        clearTimeout(sseReconnectTimeout);
      }
      
      sseReconnectTimeout = setTimeout(() => {
        setupSSE();
      }, delay);
    } else {
      console.error('SSE max reconnection attempts reached, giving up');
      showTemporaryError(translate('error_sse_connection_failed'));
    }
  };

  evtSource.onopen = function () {
    console.log("SSE connection opened.");
    sseReconnectAttempts = 0; // 重置重連計數器
    if (sseReconnectTimeout) {
      clearTimeout(sseReconnectTimeout);
      sseReconnectTimeout = null;
    }
  };
}

// 新增：比較任務列表是否有變化的輔助函數 (最全面版)
function didTasksChange(oldTasks, newTasks) {
  if (!oldTasks || !newTasks) return true; // Handle initial load or error states

  if (oldTasks.length !== newTasks.length) {
    console.log("Task length changed.");
    return true; // Length change definitely needs update
  }

  const oldTaskMap = new Map(oldTasks.map((task) => [task.id, task]));
  const newTaskIds = new Set(newTasks.map((task) => task.id)); // For checking removed tasks

  // Check for removed tasks first
  for (const oldTask of oldTasks) {
    if (!newTaskIds.has(oldTask.id)) {
      console.log(`Task removed: ${oldTask.id}`);
      return true;
    }
  }

  // Check for new or modified tasks
  for (const newTask of newTasks) {
    const oldTask = oldTaskMap.get(newTask.id);
    if (!oldTask) {
      console.log(`New task found: ${newTask.id}`);
      return true; // New task ID found
    }

    // Compare relevant fields
    const fieldsToCompare = [
      "name",
      "description",
      "status",
      "notes",
      "implementationGuide",
      "verificationCriteria",
      "summary",
    ];

    for (const field of fieldsToCompare) {
      if (oldTask[field] !== newTask[field]) {
        // Handle null/undefined comparisons carefully if needed
        // e.g., !(oldTask[field] == null && newTask[field] == null) checks if one is null/undefined and the other isn't
        if (
          !(oldTask[field] === null && newTask[field] === null) &&
          !(oldTask[field] === undefined && newTask[field] === undefined)
        ) {
          console.log(`Task ${newTask.id} changed field: ${field}`);
          return true;
        }
      }
    }

    // Compare dependencies (array of strings or objects)
    if (!compareDependencies(oldTask.dependencies, newTask.dependencies)) {
      console.log(`Task ${newTask.id} changed field: dependencies`);
      return true;
    }

    // Compare relatedFiles (array of objects) - simple length check first
    if (!compareRelatedFiles(oldTask.relatedFiles, newTask.relatedFiles)) {
      console.log(`Task ${newTask.id} changed field: relatedFiles`);
      return true;
    }

    // Optional: Compare updatedAt as a final check if other fields seem identical
    if (oldTask.updatedAt?.toString() !== newTask.updatedAt?.toString()) {
      console.log(`Task ${newTask.id} changed field: updatedAt (fallback)`);
      return true;
    }
  }

  return false; // No significant changes detected
}

// Helper function to compare dependency arrays
function compareDependencies(deps1, deps2) {
  const arr1 = deps1 || [];
  const arr2 = deps2 || [];

  if (arr1.length !== arr2.length) return false;

  // Extract IDs whether they are strings or objects {taskId: string}
  const ids1 = new Set(
    arr1.map((dep) =>
      typeof dep === "object" && dep !== null ? dep.taskId : dep
    )
  );
  const ids2 = new Set(
    arr2.map((dep) =>
      typeof dep === "object" && dep !== null ? dep.taskId : dep
    )
  );

  if (ids1.size !== ids2.size) return false; // Different number of unique deps
  for (const id of ids1) {
    if (!ids2.has(id)) return false;
  }
  return true;
}

// Helper function to compare relatedFiles arrays (can be simple or complex)
function compareRelatedFiles(files1, files2) {
  const arr1 = files1 || [];
  const arr2 = files2 || [];

  if (arr1.length !== arr2.length) return false;

  // Simple comparison: check if paths and types are the same in the same order
  // For a more robust check, convert to Sets of strings like `path|type` or do deep object comparison
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i].path !== arr2[i].path || arr1[i].type !== arr2[i].type) {
      return false;
    }
    // Add more field comparisons if needed (description, lines, etc.)
    // if (arr1[i].description !== arr2[i].description) return false;
  }
  return true;
}

// 新增：顯示臨時錯誤訊息的函數
function showTemporaryError(message) {
  const errorElement = document.createElement("div");
  errorElement.className = "temporary-error";
  errorElement.textContent = message; // 保持消息本身
  document.body.appendChild(errorElement);
  setTimeout(() => {
    errorElement.remove();
  }, 3000); // 顯示 3 秒
}

// 渲染任務列表 - *** 需要進一步優化以實現智慧更新 ***
function renderTasks() {
  console.log("Rendering tasks..."); // 添加日誌
  const filterValue = statusFilter.value;

  let filteredTasks = tasks;
  if (filterValue !== "all") {
    filteredTasks = filteredTasks.filter((task) => task.status === filterValue);
  }

  if (searchTerm) {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    filteredTasks = filteredTasks.filter(
      (task) =>
        (task.name && task.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (task.description &&
          task.description.toLowerCase().includes(lowerCaseSearchTerm))
    );
  }

  // 儲存篩選後的任務 ID 集合，用於圖形渲染
  const filteredTaskIds = new Set(filteredTasks.map(task => task.id));

  filteredTasks.sort((a, b) => {
    switch (sortOption) {
      case "name-asc":
        return (a.name || "").localeCompare(b.name || "");
      case "name-desc":
        return (b.name || "").localeCompare(a.name || "");
      case "status":
        const statusOrder = { pending: 1, in_progress: 2, completed: 3 };
        return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
      case "date-asc":
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      case "date-desc":
      default:
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }
  });

  // 更新圖形的顯示狀態
  updateGraphVisibility(filteredTaskIds);

  // --- 簡單粗暴的替換 (會導致閃爍) ---
  // TODO: 實現 DOM Diffing 或更智慧的更新策略
  if (filteredTasks.length === 0) {
    taskListElement.innerHTML = `<div class="placeholder">${translate(
      "task_list_empty"
    )}</div>`;
  } else {
    taskListElement.innerHTML = filteredTasks
      .map(
        (task) => `
            <div class="task-item status-${task.status.replace(
              "_",
              "-"
            )}" data-id="${task.id}" onclick="selectTask('${task.id}')">
            <h3>${task.name}</h3>
            <div class="task-meta">
                <span class="task-status status-${task.status.replace(
                  "_",
                  "-"
                )}">${getStatusText(task.status)}</span>
                <div class="task-id-wrapper">
                  <code class="task-list-id" title="${task.id}">${task.id.substring(0, 8)}...</code>
                  <button class="copy-btn-mini" onclick="copyTaskId('${task.id}'); event.stopPropagation();" title="Copy ID">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                </div>
            </div>
            </div>
        `
      )
      .join("");
  }
  // --- 結束簡單粗暴的替換 ---

  // 重新應用選中狀態
  if (selectedTaskId) {
    const taskExists = tasks.some((t) => t.id === selectedTaskId);
    if (taskExists) {
      const selectedElement = document.querySelector(
        `.task-item[data-id="${selectedTaskId}"]`
      );
      if (selectedElement) {
        selectedElement.classList.add("selected");
      }
    } else {
      // 如果選中的任務在新的列表中不存在了，清除選擇
      console.log(
        `Selected task ${selectedTaskId} no longer exists, clearing selection.`
      );
      selectedTaskId = null;
      taskDetailsContent.innerHTML = `<p class="placeholder">${translate(
        "task_details_placeholder"
      )}</p>`;
      highlightNode(null); // 清除圖表高亮
    }
  }
}

// 新增：更新图形可见性的函数
function updateGraphVisibility(filteredTaskIds) {
  if (!g) return;

  // 更新节点的样式
  g.select(".nodes")
    .selectAll("g.node-item")
    .style("opacity", d => filteredTaskIds.has(d.id) ? 1 : 0.2)
    .style("filter", d => filteredTaskIds.has(d.id) ? "none" : "grayscale(80%)");

  // 更新连接的样式
  g.select(".links")
    .selectAll("line.link")
    .style("opacity", d => {
      const sourceVisible = filteredTaskIds.has(d.source.id || d.source);
      const targetVisible = filteredTaskIds.has(d.target.id || d.target);
      return (sourceVisible && targetVisible) ? 0.6 : 0.1;
    })
    .style("stroke", d => {
      const sourceVisible = filteredTaskIds.has(d.source.id || d.source);
      const targetVisible = filteredTaskIds.has(d.target.id || d.target);
      return (sourceVisible && targetVisible) ? "#999" : "#ccc";
    });

  // 更新缩略图中的节点和连接样式
  const minimapContent = svg.select(".minimap-content");
  
  minimapContent.selectAll(".minimap-node")
    .style("opacity", d => filteredTaskIds.has(d.id) ? 1 : 0.2)
    .style("filter", d => filteredTaskIds.has(d.id) ? "none" : "grayscale(80%)");

  minimapContent.selectAll(".minimap-link")
    .style("opacity", d => {
      const sourceVisible = filteredTaskIds.has(d.source.id || d.source);
      const targetVisible = filteredTaskIds.has(d.target.id || d.target);
      return (sourceVisible && targetVisible) ? 0.6 : 0.1;
    })
    .style("stroke", d => {
      const sourceVisible = filteredTaskIds.has(d.source.id || d.source);
      const targetVisible = filteredTaskIds.has(d.target.id || d.target);
      return (sourceVisible && targetVisible) ? "#999" : "#ccc";
    });
}

// 新增：将节点移动到视图中心的函数
function centerNode(nodeId) {
  if (!svg || !g || !simulation) return;

  const node = simulation.nodes().find(n => n.id === nodeId);
  if (!node) return;

  // 获取当前视图的变换状态
  const transform = d3.zoomTransform(svg.node());
  
  // 计算需要的变换以将节点居中
  const scale = transform.k; // 保持当前缩放级别
  const x = width / 2 - node.x * scale;
  const y = height / 2 - node.y * scale;

  // 使用过渡动画平滑地移动到新位置
  svg.transition()
    .duration(750) // 750ms的过渡时间
    .call(zoom.transform, d3.zoomIdentity
      .translate(x, y)
      .scale(scale)
    );
}

// 修改选择任务的函数
function selectTask(taskId) {
  // 清除旧的选中状态和高亮
  if (selectedTaskId) {
    const previousElement = document.querySelector(
      `.task-item[data-id="${selectedTaskId}"]`
    );
    if (previousElement) {
      previousElement.classList.remove("selected");
    }
  }

  // 如果再次点击同一个任务，则取消选中
  if (selectedTaskId === taskId) {
    selectedTaskId = null;
    taskDetailsContent.innerHTML = `<p class="placeholder">${translate(
      "task_details_placeholder"
    )}</p>`;
    highlightNode(null); // 取消高亮
    return;
  }

  selectedTaskId = taskId;

  // 添加新的选中状态
  const selectedElement = document.querySelector(
    `.task-item[data-id="${taskId}"]`
  );
  if (selectedElement) {
    selectedElement.classList.add("selected");
  }

  // 获取并显示任务详情
  const task = tasks.find((t) => t.id === taskId);

  if (!task) {
    taskDetailsContent.innerHTML = `<div class="placeholder">${translate(
      "error_task_not_found"
    )}</div>`;
    return;
  }

  // --- 安全地填充任務詳情 ---
  console.log('Generating task details for task:', taskId);
  // 1. 創建基本骨架 (使用 innerHTML，但將動態內容替換為帶 ID 的空元素)
  taskDetailsContent.innerHTML = `
    <div class="task-details-header">
      <h3 id="detail-name"></h3>
      <div class="task-meta">
        <span>${translate(
          "task_detail_status_label"
        )} <span id="detail-status" class="task-status"></span></span>
        <div class="task-id-container">
          <span class="task-id-label">ID:</span>
          <code id="detail-task-id" class="task-id"></code>
          <button class="copy-btn" onclick="copyTaskId('${taskId}')" title="Copy ID">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 新增：條件顯示 Summary -->
    <div class="task-details-section" id="detail-summary-section" style="display: none;">
      <h4>${translate("task_detail_summary_title")}</h4>
      <p id="detail-summary"></p>
    </div>
    
    <div class="task-details-section">
      <h4>${translate("task_detail_description_title")}</h4>
      <p id="detail-description"></p>
    </div>
    
    <div class="task-details-section">
      <h4>${translate("task_detail_implementation_guide_title")}</h4>
      <textarea id="detail-implementation-guide" class="implementation-guide-textarea" placeholder="Enter implementation guide..."></textarea>
      <div class="guide-actions">
        <button class="save-guide-btn" onclick="saveImplementationGuide('${taskId}')">Save Changes</button>
        <button class="cancel-guide-btn" onclick="cancelImplementationGuide()">Cancel</button>
      </div>
    </div>
    
    <div class="task-details-section">
      <h4>${translate("task_detail_verification_criteria_title")}</h4>
      <p id="detail-verification-criteria"></p>
    </div>
    
    <div class="task-details-section">
      <h4>${translate("task_detail_dependencies_title")}</h4>
      <div class="dependencies" id="detail-dependencies">
        <!-- Dependencies will be populated by JS -->
      </div>
    </div>
    
    <div class="task-details-section">
      <h4>${translate("task_detail_related_files_title")}</h4>
      <div class="related-files" id="detail-related-files">
        <!-- Related files will be populated by JS -->
      </div>
    </div>

    <div class="task-details-section">
      <h4>${translate("task_detail_notes_title")}</h4>
      <p id="detail-notes"></p>
    </div>
    
    <div class="task-details-section">
      <h4>Timestamps</h4>
      <div class="timestamps">
        <div><strong>Created:</strong> <span id="detail-created-at"></span></div>
        <div><strong>Updated:</strong> <span id="detail-updated-at"></span></div>
      </div>
    </div>
  `;

  // 2. 獲取對應元素並使用 textContent 安全地填充內容
  const detailName = document.getElementById("detail-name");
  const detailTaskId = document.getElementById("detail-task-id");
  const detailStatus = document.getElementById("detail-status");
  const detailDescription = document.getElementById("detail-description");
  const detailImplementationGuide = document.getElementById(
    "detail-implementation-guide"
  );
  const detailVerificationCriteria = document.getElementById(
    "detail-verification-criteria"
  );
  // 新增：獲取 Summary 相關元素
  const detailSummarySection = document.getElementById(
    "detail-summary-section"
  );
  const detailSummary = document.getElementById("detail-summary");
  const detailNotes = document.getElementById("detail-notes");
  const detailDependencies = document.getElementById("detail-dependencies");
  const detailRelatedFiles = document.getElementById("detail-related-files");
  const detailCreatedAt = document.getElementById("detail-created-at");
  const detailUpdatedAt = document.getElementById("detail-updated-at");

  if (detailName) detailName.textContent = task.name;
  if (detailTaskId) detailTaskId.textContent = task.id;
  if (detailStatus) {
    detailStatus.textContent = getStatusText(task.status);
    detailStatus.className = `task-status status-${task.status.replace(
      "_",
      "-"
    )}`;
  }
  if (detailDescription)
    detailDescription.textContent =
      task.description || translate("task_detail_no_description");
  if (detailImplementationGuide) {
    detailImplementationGuide.value =
      task.implementationGuide ||
      translate("task_detail_no_implementation_guide");
    // Store original value for cancel functionality
    detailImplementationGuide.dataset.originalValue = detailImplementationGuide.value;
  }
  if (detailVerificationCriteria)
    detailVerificationCriteria.textContent =
      task.verificationCriteria ||
      translate("task_detail_no_verification_criteria");

  // 新增：填充 Summary (如果存在且已完成)
  if (task.summary && detailSummarySection && detailSummary) {
    detailSummary.textContent = task.summary;
    detailSummarySection.style.display = "block"; // 顯示區塊
  } else if (detailSummarySection) {
    detailSummarySection.style.display = "none"; // 隱藏區塊
  }

  if (detailNotes)
    detailNotes.textContent = task.notes || translate("task_detail_no_notes");
  
  // Populate timestamps
  if (detailCreatedAt) {
    detailCreatedAt.textContent = task.createdAt 
      ? new Date(task.createdAt).toLocaleString() 
      : "N/A";
  }
  if (detailUpdatedAt) {
    detailUpdatedAt.textContent = task.updatedAt 
      ? new Date(task.updatedAt).toLocaleString() 
      : "N/A";
  }

  // 3. 動態生成依賴項和相關文件 (這些可以包含安全的 HTML 結構如 span)
  if (detailDependencies) {
    const dependenciesHtml =
      task.dependencies && task.dependencies.length
        ? task.dependencies
            .map((dep) => {
              const depId =
                typeof dep === "object" && dep !== null && dep.taskId
                  ? dep.taskId
                  : dep;
              const depTask = tasks.find((t) => t.id === depId);
              // Translate the fallback text for unknown dependency
              const depName = depTask
                ? depTask.name
                : `${translate("task_detail_unknown_dependency")}(${depId})`;
              const span = document.createElement("span");
              span.className = "dependency-tag";
              span.dataset.id = depId;
              span.textContent = depName;
              span.onclick = () => highlightNode(depId);
              return span.outerHTML;
            })
            .join("")
        : `<span class="placeholder">${translate(
            "task_detail_no_dependencies"
          )}</span>`; // Translate placeholder
    detailDependencies.innerHTML = dependenciesHtml;
  }

  if (detailRelatedFiles) {
    const relatedFilesHtml =
      task.relatedFiles && task.relatedFiles.length
        ? task.relatedFiles
            .map((file) => {
              const span = document.createElement("span");
              span.className = "file-tag";
              span.title = file.description || "";
              const pathText = document.createTextNode(`${file.path} `);
              const small = document.createElement("small");
              small.textContent = `(${file.type})`; // Type is likely technical, maybe no translation needed?
              span.appendChild(pathText);
              span.appendChild(small);
              return span.outerHTML;
            })
            .join("")
        : `<span class="placeholder">${translate(
            "task_detail_no_related_files"
          )}</span>`; // Translate placeholder
    detailRelatedFiles.innerHTML = relatedFilesHtml;
  }

  // --- 原來的 innerHTML 賦值已移除 ---

  // 高亮节点并将其移动到中心
  highlightNode(taskId);
  centerNode(taskId);
}

// 新增：重置視圖功能
function resetView() {
  if (!svg || !simulation) return;

  // 添加重置動畫效果
  resetViewBtn.classList.add("resetting");

  // 計算視圖中心
  const centerX = width / 2;
  const centerY = height / 2;

  // 重置縮放和平移（使用 transform 過渡）
  svg.transition()
    .duration(750)
    .call(zoom.transform, d3.zoomIdentity);

  // 重置所有節點位置到中心附近
  simulation.nodes().forEach(node => {
    node.x = centerX + (Math.random() - 0.5) * 50; // 在中心點附近隨機分佈
    node.y = centerY + (Math.random() - 0.5) * 50;
    node.fx = null; // 清除固定位置
    node.fy = null;
  });

  // 重置力導向模擬
  simulation
    .force("center", d3.forceCenter(centerX, centerY))
    .alpha(1) // 完全重啟模擬
    .restart();

  // 750ms 後移除動畫類
  setTimeout(() => {
    resetViewBtn.classList.remove("resetting");
  }, 750);
}

// 新增：初始化縮放行為
function initZoom() {
  zoom = d3.zoom()
    .scaleExtent([0.1, 4]) // 設置縮放範圍
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
      updateMinimap(); // 在縮放時更新縮略圖
    });
  
  if (svg) {
    svg.call(zoom);
  }
}

// 渲染依賴關係圖 - 修改為全局視圖和 enter/update/exit 模式
function renderDependencyGraph() {
  if (!dependencyGraphElement || !window.d3) {
    console.warn("D3 or dependency graph element not found.");
    if (dependencyGraphElement) {
      if (!dependencyGraphElement.querySelector("svg")) {
        dependencyGraphElement.innerHTML = `<p class="placeholder">${translate("error_loading_graph_d3")}</p>`;
      }
    }
    return;
  }

  updateDimensions();

  // 如果沒有任務，清空圖表並顯示提示
  if (tasks.length === 0) {
    dependencyGraphElement.innerHTML = `<p class="placeholder">${translate("dependency_graph_placeholder_empty")}</p>`;
    svg = null;
    g = null;
    simulation = null;
    return;
  }

  // 1. 準備節點 (Nodes) 和連結 (Links)
  const nodes = tasks.map((task) => ({
    id: task.id,
    name: task.name,
    status: task.status,
    x: simulation?.nodes().find((n) => n.id === task.id)?.x,
    y: simulation?.nodes().find((n) => n.id === task.id)?.y,
    fx: simulation?.nodes().find((n) => n.id === task.id)?.fx,
    fy: simulation?.nodes().find((n) => n.id === task.id)?.fy,
  }));

  const links = [];
  tasks.forEach((task) => {
    if (task.dependencies && task.dependencies.length > 0) {
      task.dependencies.forEach((dep) => {
        const sourceId = typeof dep === "object" ? dep.taskId : dep;
        const targetId = task.id;
        if (nodes.some((n) => n.id === sourceId) && nodes.some((n) => n.id === targetId)) {
          links.push({ source: sourceId, target: targetId });
        } else {
          console.warn(`Dependency link ignored: Task ${sourceId} or ${targetId} not found in task list.`);
        }
      });
    }
  });

  if (!svg) {
    // --- 首次渲染 ---
    console.log("First render of dependency graph");
    dependencyGraphElement.innerHTML = "";

    svg = d3.select(dependencyGraphElement)
      .append("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("preserveAspectRatio", "xMidYMid meet");

    // 添加縮略圖背景
    const minimapSize = Math.min(width, height) * 0.2; // 縮略圖大小為主視圖的20%
    const minimapMargin = 40;
    
    // 創建縮略圖容器
    const minimap = svg.append("g")
      .attr("class", "minimap")
      .attr("transform", `translate(${width - minimapSize - minimapMargin}, ${height - minimapSize - minimapMargin*(height/width)})`);

    // 添加縮略圖背景
    minimap.append("rect")
      .attr("width", minimapSize)
      .attr("height", minimapSize)
      .attr("fill", "rgba(0, 0, 0, 0.2)")
      .attr("stroke", "#666")
      .attr("stroke-width", 1)
      .attr("rx", 4)
      .attr("ry", 4);

    // 創建縮略圖內容組
    minimap.append("g")
      .attr("class", "minimap-content");

    // 添加視口指示器
    minimap.append("rect")
      .attr("class", "minimap-viewport");

    g = svg.append("g");

    // 初始化並添加縮放行為
    initZoom();

    // 添加箭頭定義
    g.append("defs")
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "-0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#999");

    // 初始化力導向模擬
    simulation = d3.forceSimulation()
      .force("link", d3.forceLink().id((d) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(30))
      // 新增：水平分布力，用於優化節點在水平方向的分布，根據節點的入度和出度來決定節點的水平位置，入度為0的節點（起始節點）靠左，出度為0的節點（終止節點）靠右，其他節點則分布在中間位置
      .force("x", d3.forceX().x(d => {
        // 計算節點的入度和出度
        const inDegree = links.filter(l => (l.target.id || l.target) === d.id).length;
        const outDegree = links.filter(l => (l.source.id || l.source) === d.id).length;
        
        if (inDegree === 0) {
          // 入度為0的節點（起始節點）靠左
          return width * 0.2;
        } else if (outDegree === 0) {
          // 出度為0的節點（終止節點）靠右
          return width * 0.8;
        } else {
          // 其他節點在中間
          return width * 0.5;
        }
      }).strength(0.2))
      // 新增：基于節點度數的垂直分布力
      .force("y", d3.forceY().y(height / 2).strength(d => {
        // 計算節點的總度數（入度+出度）
        const inDegree = links.filter(l => (l.target.id || l.target) === d.id).length;
        const outDegree = links.filter(l => (l.source.id || l.source) === d.id).length;
        const totalDegree = inDegree + outDegree;
        
        // 度數越大，力越大（基礎力0.05，每個連接增加0.03，最大0.3）
        return Math.min(0.05 + totalDegree * 0.03, 0.3);
      }))
      .on("tick", ticked);

    // 添加用於存放連結和節點的組
    g.append("g").attr("class", "links");
    g.append("g").attr("class", "nodes");
  } else {
    // --- 更新圖表渲染 ---
    console.log("Updating dependency graph");
    svg.attr("viewBox", [0, 0, width, height]);
    simulation.force("center", d3.forceCenter(width / 2, height / 2));
  }

  // --- 預先運算穩定的節點位置 ---
  // 複製節點和連結以進行穩定化計算
  const stableNodes = [...nodes];
  const stableLinks = [...links];
  
  // 暫時創建一個模擬器來計算穩定的位置
  const stableSim = d3
    .forceSimulation(stableNodes)
    .force("link", d3.forceLink(stableLinks).id(d => d.id).distance(100))
    .force("charge", d3.forceManyBody().strength(-300))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collide", d3.forceCollide().radius(30));
  
  // 預熱模擬獲得穩定位置
  for (let i = 0; i < 10; i++) {
    stableSim.tick();
  }
  
  // 將穩定位置複製回原始節點
  stableNodes.forEach((stableNode) => {
    const originalNode = nodes.find(n => n.id === stableNode.id);
    if (originalNode) {
      originalNode.x = stableNode.x;
      originalNode.y = stableNode.y;
    }
  });
  
  // 停止臨時模擬器
  stableSim.stop();
  // --- 預先運算結束 ---

  // 3. 更新連結 (無動畫)
  const linkSelection = g
    .select(".links") // 選擇放置連結的 g 元素
    .selectAll("line.link")
    .data(
      links,
      (d) => `${d.source.id || d.source}-${d.target.id || d.target}`
    ); // Key function 基於 source/target ID

  // Exit - 直接移除舊連結
  linkSelection.exit().remove();

  // Enter - 添加新連結 (無動畫)
  const linkEnter = linkSelection
    .enter()
    .append("line")
    .attr("class", "link")
    .attr("stroke", "#999")
    .attr("marker-end", "url(#arrowhead)")
    .attr("stroke-opacity", 0.6)
    .attr("stroke-width", 1.5);

  // 立即設置連結位置
  linkEnter
    .attr("x1", d => d.source.x || 0)
    .attr("y1", d => d.source.y || 0)
    .attr("x2", d => d.target.x || 0)
    .attr("y2", d => d.target.y || 0);

  // 4. 更新節點 (無動畫)
  const nodeSelection = g
    .select(".nodes") // 選擇放置節點的 g 元素
    .selectAll("g.node-item")
    .data(nodes, (d) => d.id); // 使用 ID 作為 key

  // Exit - 直接移除舊節點
  nodeSelection.exit().remove();

  // Enter - 添加新節點組 (無動畫，直接在最終位置創建)
  const nodeEnter = nodeSelection
    .enter()
    .append("g")
    .attr("class", (d) => `node-item status-${getStatusClass(d.status)}`) // 使用輔助函數設置 class
    .attr("data-id", (d) => d.id)
    // 直接使用預計算的位置，無需縮放或透明度過渡
    .attr("transform", (d) => `translate(${d.x || 0}, ${d.y || 0})`)
    .call(drag(simulation)); // 添加拖拽

  // 添加圓形到 Enter 選擇集
  nodeEnter
    .append("circle")
    .attr("r", 10)
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .attr("fill", getNodeColor); // 直接設置顏色

  // 添加文字到 Enter 選擇集
  nodeEnter
    .append("text")
    .attr("x", 15)
    .attr("y", 3)
    .text((d) => d.name)
    .attr("font-size", "10px")
    .attr("fill", "#ccc");

  // 添加標題 (tooltip) 到 Enter 選擇集
  nodeEnter
    .append("title")
    .text((d) => `${d.name} (${getStatusText(d.status)})`);

  // 添加點擊事件到 Enter 選擇集
  nodeEnter.on("click", (event, d) => {
    selectTask(d.id);
    event.stopPropagation();
  });

  // Update - 立即更新現有節點 (無動畫)
  nodeSelection
    .attr("transform", (d) => `translate(${d.x || 0}, ${d.y || 0})`)
    .attr("class", (d) => `node-item status-${getStatusClass(d.status)}`);

  nodeSelection
    .select("circle")
    .attr("fill", getNodeColor);

  // << 新增：重新定義 drag 函數 >>
  function drag(simulation) {
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      // 取消固定位置，讓節點可以繼續被力導引影響 (如果需要)
      // d.fx = null;
      // d.fy = null;
      // 或者保留固定位置直到再次拖動
    }

    return d3
      .drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }
  // << drag 函數定義結束 >>

  // 5. 更新力導向模擬，但不啟動
  simulation.nodes(nodes); // 更新模擬節點
  simulation.force("link").links(links); // 更新模擬連結
  
  // 更新水平分布力的目標位置
  simulation.force("x").x(d => {
    const inDegree = links.filter(l => (l.target.id || l.target) === d.id).length;
    const outDegree = links.filter(l => (l.source.id || l.source) === d.id).length;
    
    if (inDegree === 0) {
      return width * 0.2;
    } else if (outDegree === 0) {
      return width * 0.8;
    } else {
      return width * 0.5;
    }
  });
  // 注意：移除了 restart() 調用，防止刷新時的動畫跳變
}

// Tick 函數: 更新節點和連結位置
function ticked() {
  if (!g) return;

  // 更新連結位置
  g.select(".links")
    .selectAll("line.link")
    .attr("x1", (d) => d.source.x)
    .attr("y1", (d) => d.source.y)
    .attr("x2", (d) => d.target.x)
    .attr("y2", (d) => d.target.y);

  // 更新節點組位置
  g.select(".nodes")
    .selectAll("g.node-item")
    // << 修改：添加座標後備值 >>
    .attr("transform", (d) => `translate(${d.x || 0}, ${d.y || 0})`);

  // 更新縮略圖
  updateMinimap();
}

// 函數：根據節點數據返回顏色 (示例)
function getNodeColor(nodeData) {
  switch (nodeData.status) {
    case "已完成":
    case "completed":
      return "var(--secondary-color)";
    case "進行中":
    case "in_progress":
      return "var(--primary-color)";
    case "待處理":
    case "pending":
      return "#f1c40f"; // 與進度條和狀態標籤一致
    default:
      return "#7f8c8d"; // 未知狀態
  }
}

// Copy task ID to clipboard
function copyTaskId(taskId) {
  // Try modern clipboard API first
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(taskId).then(() => {
      showCopySuccess();
    }).catch(err => {
      console.error('Clipboard API failed:', err);
      // Fallback to older method
      fallbackCopyTextToClipboard(taskId);
    });
  } else {
    // Browser doesn't support Clipboard API
    fallbackCopyTextToClipboard(taskId);
  }
}

// Fallback copy method for older browsers or when clipboard API fails
function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  
  // Avoid scrolling to bottom
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    const successful = document.execCommand('copy');
    if (successful) {
      showCopySuccess();
    } else {
      showCopyError();
    }
  } catch (err) {
    console.error('Fallback copy failed:', err);
    showCopyError();
  }
  
  document.body.removeChild(textArea);
}

// Show success notification
function showCopySuccess() {
  const btn = event.target.closest('.copy-btn, .copy-btn-mini');
  if (btn) {
    const originalTitle = btn.title;
    btn.title = 'Copied!';
    btn.classList.add('copied');
    
    setTimeout(() => {
      btn.title = originalTitle;
      btn.classList.remove('copied');
    }, 2000);
  }
  
  // Show a floating notification
  const notification = document.createElement('div');
  notification.className = 'copy-notification';
  notification.textContent = 'Task ID copied!';
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 2000);
}

// Show error message
function showCopyError() {
  // Try showing the task ID for manual copy
  const taskIdText = event.target.closest('[data-id]')?.dataset.id || 'Task ID';
  alert(`Could not copy automatically. Task ID: ${taskIdText}\n\nYou can select and copy this text manually.`);
}

// Save implementation guide changes
async function saveImplementationGuide(taskId) {
  const textarea = document.getElementById('detail-implementation-guide');
  const newGuide = textarea.value;
  
  try {
    // Find the task
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      alert('Task not found');
      return;
    }
    
    // Update the task
    task.implementationGuide = newGuide;
    
    // Save to file (you'll need to implement an API endpoint for this)
    const response = await fetch('/api/tasks/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
      taskId: taskId,
      updates: {
      implementationGuide: newGuide,
        projectName: currentProject, // 添加項目上下文
        planName: currentPlan // 添加計劃上下文
        }
        })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save changes');
    }
    
    // Update the original value
    textarea.dataset.originalValue = newGuide;
    
    // Show success notification
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.textContent = 'Implementation guide saved!';
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 2000);
    
    // Refresh tasks
    await fetchTasks();
    
  } catch (error) {
    console.error('Failed to save implementation guide:', error);
    alert('Failed to save changes. Please try again.');
  }
}

// Cancel implementation guide changes
function cancelImplementationGuide() {
  const textarea = document.getElementById('detail-implementation-guide');
  if (textarea && textarea.dataset.originalValue !== undefined) {
    textarea.value = textarea.dataset.originalValue;
  }
}

// 新增：設置活躍計劃功能
async function setActivePlan() {
  if (!currentProject || !currentPlan) {
    console.warn('No project or plan selected');
    return;
  }

  // 獲取當前選中的計劃名稱
  const selectedPlanOption = planSelector.options[planSelector.selectedIndex];
  const planName = selectedPlanOption ? selectedPlanOption.textContent : 'Unknown Plan';

  try {
    // 設置按鈕為加載狀態
    setActivePlanBtn.classList.add('loading');
    setActivePlanBtn.disabled = true;
    
    const response = await fetch('/api/plans/set-active', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectName: currentProject,
        planName: currentPlan
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    
    // 顯示成功通知
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.textContent = translate('set_active_plan_success', { planName }) || `Plan "${planName}" set as active!`;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);

    // 更新計劃選擇器和按鈕狀態
    await fetchPlans();
    syncPlanSelector(); // 同步選擇器狀態

  } catch (error) {
    console.error('Failed to set active plan:', error);
    
    // 顯示錯誤通知
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.style.backgroundColor = 'var(--danger-color)';
    notification.textContent = translate('set_active_plan_error', { error: error.message }) || `Failed to set active plan: ${error.message}`;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 5000);
  } finally {
    // 移除加載狀態
    setActivePlanBtn.classList.remove('loading');
    updateSetActivePlanButton(); // 重新評估按鈕狀態
    updateDeletePlanButton(); // 重新評估刪除按鈕狀態
  }
}

// 新增：刪除計劃功能
async function deletePlan() {
  if (!currentProject || !currentPlan) {
    console.warn('No project or plan selected');
    return;
  }

  // 獲取當前選中的計劃名稱
  const selectedPlanOption = planSelector.options[planSelector.selectedIndex];
  const planName = selectedPlanOption ? selectedPlanOption.textContent.replace(/^★\s*/, '') : 'Unknown Plan'; // Remove star indicator

  // 防止刪除默認計劃
  if (currentPlan === 'default') {
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.style.backgroundColor = 'var(--danger-color)';
    notification.textContent = translate('delete_plan_default_protection') || 'Cannot delete the default plan';
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
    return;
  }

  // 顯示確認對話
  const confirmMessage = translate('delete_plan_confirm', { planName }) || 
    `Are you sure you want to delete plan "${planName}"?\n\nThis action cannot be undone. The plan and all its tasks will be archived.`;
  
  if (!confirm(confirmMessage)) {
    return;
  }

  try {
    // 設置按鈕為加載狀態
    deletePlanBtn.classList.add('loading');
    deletePlanBtn.disabled = true;
    
    const response = await fetch('/api/plans/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectName: currentProject,
        planName: currentPlan,
        confirm: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      // 特殊處理確認要求
      if (errorData.requiresConfirmation) {
        const secondConfirm = confirm(errorData.message + '\n\nClick OK to proceed with deletion.');
        if (secondConfirm) {
          // 重新發送請求並明確確認
          return deletePlan(); // 遞归調用
        }
        return;
      }
      
      throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    
    // 顯示成功通知
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.style.backgroundColor = 'var(--success-color)';
    notification.textContent = translate('delete_plan_success', { planName }) || `Plan "${planName}" deleted successfully and archived`;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 4000);

    // 重置當前計劃選擇器為第一個可用計劃
    currentPlan = '';
    
    // 更新計劃列表
    await fetchPlans();
    
    // 重新獲取任務列表
    fetchTasks();

  } catch (error) {
    console.error('Failed to delete plan:', error);
    
    // 顯示錯誤通知
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.style.backgroundColor = 'var(--danger-color)';
    notification.textContent = translate('delete_plan_error', { planName, error: error.message }) || `Failed to delete plan "${planName}": ${error.message}`;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 5000);
  } finally {
    // 移除加載狀態
    deletePlanBtn.classList.remove('loading');
    updateDeletePlanButton(); // 重新評估按鈕狀態
  }
}

// 新增：更新計劃標題顯示
function updatePlanHeader() {
  if (!planHeaderElement || !planNameElement || !planIdElement) {
    console.warn('Plan header elements not found');
    return;
  }

  // 檢查是否有選中的計劃
  if (!currentPlan || currentPlan === '') {
    // 沒有選中計劃時隱藏標題
    planHeaderElement.style.display = 'none';
    return;
  }

  // 查找當前計劃的詳細信息
  const selectedPlan = plans.find(plan => plan.id === currentPlan);
  
  if (!selectedPlan) {
    // 找不到計劃信息時隱藏標題
    planHeaderElement.style.display = 'none';
    return;
  }

  // 更新計劃名稱，檢查是否為活躍計劃（基於服務器返回的 current 標記）
  const isActivePlan = selectedPlan.current === true;
  
  // 設置計劃名稱，為活躍計劃添加星號
  const displayName = isActivePlan ? `★ ${selectedPlan.name}` : selectedPlan.name;
  planNameElement.textContent = displayName;
  
  if (isActivePlan) {
    planNameElement.style.color = 'var(--accent-color)';
  } else {
    planNameElement.style.color = 'var(--primary-color)';
  }

  // 更新計劃ID
  planIdElement.textContent = selectedPlan.id;

  // 顯示計劃標題
  planHeaderElement.style.display = 'block';
}

// 新增：複製計劃ID功能
function copyPlanId() {
  const planId = planIdElement ? planIdElement.textContent : currentPlan;
  
  if (!planId) {
    console.warn('No plan ID to copy');
    return;
  }

  // 使用與任務ID相同的複製邏輯
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(planId).then(() => {
      showPlanCopySuccess();
    }).catch(err => {
      console.error('Clipboard API failed:', err);
      fallbackCopyTextToClipboard(planId);
    });
  } else {
    fallbackCopyTextToClipboard(planId);
  }
}

// 新增：顯示計劃ID複製成功通知
function showPlanCopySuccess() {
  const btn = event.target.closest('.copy-plan-btn');
  if (btn) {
    const originalTitle = btn.title;
    btn.title = 'Copied!';
    btn.classList.add('copied');
    
    setTimeout(() => {
      btn.title = originalTitle;
      btn.classList.remove('copied');
    }, 2000);
  }
  
  // 顯示浮動通知
  const notification = document.createElement('div');
  notification.className = 'copy-notification';
  notification.textContent = translate('plan_id_copied') || 'Plan ID copied!';
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 2000);
}

// 新增：更新設置活躍計劃按鈕狀態
function updateSetActivePlanButton() {
  if (!setActivePlanBtn) return;

  // 檢查是否有選中的計劃
  const hasSelectedPlan = currentPlan && currentPlan !== '';
  
  // 檢查選中的計劃是否已經是活躍的（基於服務器返回的 current 標記）
  let isAlreadyActive = false;
  if (plans.length > 0 && currentPlan) {
    const selectedPlan = plans.find(plan => plan.id === currentPlan);
    // 使用服務器返回的 current 標記來判斷
    isAlreadyActive = selectedPlan && selectedPlan.current === true;
  }

  // 啟用/禁用按鈕
  const shouldEnable = hasSelectedPlan && !isAlreadyActive && !setActivePlanBtn.classList.contains('loading');
  setActivePlanBtn.disabled = !shouldEnable;

  // 更新按鈕文本和標題
  const buttonText = setActivePlanBtn.querySelector('span');
  const buttonTitle = setActivePlanBtn;
  
  if (isAlreadyActive) {
    if (buttonText) buttonText.textContent = translate('plan_already_active') || 'Already Active';
    buttonTitle.title = translate('plan_already_active_title') || 'This plan is already active';
  } else if (!hasSelectedPlan) {
    if (buttonText) buttonText.textContent = translate('set_active_plan_btn_text') || 'Set Active';
    buttonTitle.title = translate('set_active_plan_select_plan') || 'Select a plan first';
  } else {
    if (buttonText) buttonText.textContent = translate('set_active_plan_btn_text') || 'Set Active';
    buttonTitle.title = translate('set_active_plan_btn_title') || 'Set as Active Plan';
  }
}

// 新增：更新刪除計劃按鈕狀態
function updateDeletePlanButton() {
  if (!deletePlanBtn) return;

  // 檢查是否有選中的計劃
  const hasSelectedPlan = currentPlan && currentPlan !== '';
  
  // 檢查是否是默認計劃（不允許刪除）
  const isDefaultPlan = currentPlan === 'default';
  
  // 檢查是否正在加載
  const isLoading = deletePlanBtn.classList.contains('loading');

  // 啟用/禁用按鈕：只有選中了非默認計劃且未在加載時才啟用
  const shouldEnable = hasSelectedPlan && !isDefaultPlan && !isLoading;
  deletePlanBtn.disabled = !shouldEnable;

  // 更新按鈕文本和標題
  const buttonText = deletePlanBtn.querySelector('span');
  const buttonTitle = deletePlanBtn;
  
  if (isDefaultPlan) {
    if (buttonText) buttonText.textContent = translate('delete_plan_protected') || 'Protected';
    buttonTitle.title = translate('delete_plan_default_protection') || 'Cannot delete the default plan';
  } else if (!hasSelectedPlan) {
    if (buttonText) buttonText.textContent = translate('delete_plan_btn_text') || 'Delete';
    buttonTitle.title = translate('delete_plan_select_plan') || 'Select a plan first';
  } else if (isLoading) {
    if (buttonText) buttonText.textContent = translate('delete_plan_deleting') || 'Deleting...';
    buttonTitle.title = translate('delete_plan_deleting_title') || 'Deleting plan...';
  } else {
    if (buttonText) buttonText.textContent = translate('delete_plan_btn_text') || 'Delete';
    buttonTitle.title = translate('delete_plan_btn_title') || 'Delete Plan';
  }
}

// Make functions globally available
window.copyTaskId = copyTaskId;
window.copyPlanId = copyPlanId;
window.saveImplementationGuide = saveImplementationGuide;
window.cancelImplementationGuide = cancelImplementationGuide;
window.setActivePlan = setActivePlan;
window.deletePlan = deletePlan;
window.updateSetActivePlanButton = updateSetActivePlanButton;
window.updateDeletePlanButton = updateDeletePlanButton;
window.updatePlanHeader = updatePlanHeader;

// 輔助函數
function getStatusText(status) {
  switch (status) {
    case "pending":
      return translate("status_pending");
    case "in_progress":
      return translate("status_in_progress");
    case "completed":
      return translate("status_completed");
    default:
      return status;
  }
}

function updateCurrentTime() {
  const now = new Date();
  // 保留原始格式，如果需要本地化時間，可以在此處使用 translate 或其他庫
  const timeString = now.toLocaleString(); // 考慮是否需要基於 currentLang 格式化
  if (currentTimeElement) {
    // 將靜態文本和動態時間分開
    const footerTextElement = currentTimeElement.parentNode.childNodes[0];
    if (footerTextElement && footerTextElement.nodeType === Node.TEXT_NODE) {
      footerTextElement.nodeValue = translate("footer_copyright");
    }
    currentTimeElement.textContent = timeString;
  }
}
// 更新項目進度指示器
function updateProgressIndicator() {
  const totalTasks = tasks.length;
  if (totalTasks === 0) {
    progressIndicator.style.display = "none"; // 沒有任務時隱藏
    return;
  }

  progressIndicator.style.display = "block"; // 確保顯示

  const completedTasks = tasks.filter(
    (task) => task.status === "completed" || task.status === "已完成"
  ).length;
  const inProgressTasks = tasks.filter(
    (task) => task.status === "in_progress" || task.status === "進行中"
  ).length;
  const pendingTasks = tasks.filter(
    (task) => task.status === "pending" || task.status === "待處理"
  ).length;

  const completedPercent =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const inProgressPercent =
    totalTasks > 0 ? (inProgressTasks / totalTasks) * 100 : 0;
  const pendingPercent = totalTasks > 0 ? (pendingTasks / totalTasks) * 100 : 0;

  progressCompleted.style.width = `${completedPercent}%`;
  progressInProgress.style.width = `${inProgressPercent}%`;
  progressPending.style.width = `${pendingPercent}%`;

  // 更新標籤 (使用 translate)
  progressLabels.innerHTML = `
    <span class="label-completed">${translate(
      "progress_completed"
    )}: ${completedTasks} (${completedPercent.toFixed(1)}%)</span>
    <span class="label-in-progress">${translate(
      "progress_in_progress"
    )}: ${inProgressTasks} (${inProgressPercent.toFixed(1)}%)</span>
    <span class="label-pending">${translate(
      "progress_pending"
    )}: ${pendingTasks} (${pendingPercent.toFixed(1)}%)</span>
    <span class="label-total">${translate(
      "progress_total"
    )}: ${totalTasks}</span>
  `;
}

// 新增：渲染全局分析結果
function renderGlobalAnalysisResult() {
  let targetElement = document.getElementById("global-analysis-result");

  // 如果元素不存在，嘗試創建並添加到合適的位置 (例如 header 或 main content 前)
  if (!targetElement) {
    targetElement = document.createElement("div");
    targetElement.id = "global-analysis-result";
    targetElement.className = "global-analysis-section"; // 添加樣式 class
    // 嘗試插入到 header 之後或 main 之前
    const header = document.querySelector("header");
    const mainContent = document.querySelector("main");
    if (header && header.parentNode) {
      header.parentNode.insertBefore(targetElement, header.nextSibling);
    } else if (mainContent && mainContent.parentNode) {
      mainContent.parentNode.insertBefore(targetElement, mainContent);
    } else {
      // 作為最後手段，添加到 body 開頭
      document.body.insertBefore(targetElement, document.body.firstChild);
    }
  }

  if (globalAnalysisResult) {
    targetElement.innerHTML = `
            <h4 data-i18n-key="global_analysis_title">${translate(
              "global_analysis_title"
            )}</h4> 
            <pre>${globalAnalysisResult}</pre> 
        `;
    targetElement.style.display = "block";
  } else {
    targetElement.style.display = "none"; // 如果沒有結果則隱藏
    targetElement.innerHTML = ""; // 清空內容
  }
}

// 新增：高亮依賴圖中的節點
function highlightNode(taskId, status = null) {
  if (!g || !window.d3) return;

  // 清除所有節點的高亮
  g.select(".nodes") // 從 g 開始選擇
    .selectAll("g.node-item")
    .classed("highlighted", false);

  if (!taskId) return;

  // 高亮選中的節點
  const selectedNode = g
    .select(".nodes") // 從 g 開始選擇
    .select(`g.node-item[data-id="${taskId}"]`);
  if (!selectedNode.empty()) {
    selectedNode.classed("highlighted", true);
    // 可以選擇性地將選中節點帶到最前面
    // selectedNode.raise();
  }
}

// 新增：輔助函數獲取狀態 class (應放在 ticked 函數之後，getNodeColor 之前或之後均可)
function getStatusClass(status) {
  return status ? status.replace(/_/g, "-") : "unknown"; // 替換所有下劃線
}

// 新增：更新寬高的函數
function updateDimensions() {
  if (dependencyGraphElement) {
    width = dependencyGraphElement.clientWidth;
    height = dependencyGraphElement.clientHeight || 400;
  }
}

// 添加縮略圖更新函數
function updateMinimap() {
  if (!svg || !simulation) return;

  const minimapSize = Math.min(width, height) * 0.2;
  const nodes = simulation.nodes();
  const links = simulation.force("link").links();

  // 計算當前圖的邊界（添加padding）
  const padding = 20; // 添加內邊距
  const xExtent = d3.extent(nodes, d => d.x);
  const yExtent = d3.extent(nodes, d => d.y);
  const graphWidth = (xExtent[1] - xExtent[0]) || width;
  const graphHeight = (yExtent[1] - yExtent[0]) || height;

  // 計算縮放比例，確保考慮padding
  const scale = Math.min(
    minimapSize / (graphWidth + padding * 2),
    minimapSize / (graphHeight + padding * 2)
  ) * 0.9; // 0.9作為安全係數

  // 創建縮放函數，加入padding
  const minimapX = d3.scaleLinear()
    .domain([xExtent[0] - padding, xExtent[1] + padding])
    .range([0, minimapSize]);
  const minimapY = d3.scaleLinear()
    .domain([yExtent[0] - padding, yExtent[1] + padding])
    .range([0, minimapSize]);

  // 更新縮略圖中的連接
  const minimapContent = svg.select(".minimap-content");
  const minimapLinks = minimapContent.selectAll(".minimap-link")
    .data(links);

  minimapLinks.enter()
    .append("line")
    .attr("class", "minimap-link")
    .merge(minimapLinks)
    .attr("x1", d => minimapX(d.source.x))
    .attr("y1", d => minimapY(d.source.y))
    .attr("x2", d => minimapX(d.target.x))
    .attr("y2", d => minimapY(d.target.y))
    .attr("stroke", "#999")
    .attr("stroke-width", 0.5)
    .attr("stroke-opacity", 0.6);

  minimapLinks.exit().remove();

  // 更新縮略圖中的節點
  const minimapNodes = minimapContent.selectAll(".minimap-node")
    .data(nodes);

  minimapNodes.enter()
    .append("circle")
    .attr("class", "minimap-node")
    .attr("r", 2)
    .merge(minimapNodes)
    .attr("cx", d => minimapX(d.x))
    .attr("cy", d => minimapY(d.y))
    .attr("fill", getNodeColor);

  minimapNodes.exit().remove();

  // 更新視口指示器
  const transform = d3.zoomTransform(svg.node());
  const viewportWidth = width / transform.k;
  const viewportHeight = height / transform.k;
  const viewportX = -transform.x / transform.k;
  const viewportY = -transform.y / transform.k;

  svg.select(".minimap-viewport")
    .attr("x", minimapX(viewportX))
    .attr("y", minimapY(viewportY))
    .attr("width", minimapX(viewportX + viewportWidth) - minimapX(viewportX))
    .attr("height", minimapY(viewportY + viewportHeight) - minimapY(viewportY));
}

// 函數：啟用節點拖拽 (保持不變)
// ... drag ...
