/**
 * prompt 載入器
 * 提供從環境變數載入自定義 prompt 的功能
 * 支援基本的 Handlebars 語法處理（同步版本）
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function processEnvString(input: string | undefined): string {
  if (!input) return "";

  return input
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r");
}

/**
 * 載入 prompt，支援環境變數自定義
 * @param basePrompt 基本 prompt 內容
 * @param promptKey prompt 的鍵名，用於生成環境變數名稱
 * @returns 最終的 prompt 內容
 */
export function loadPrompt(basePrompt: string, promptKey: string): string {
  // 轉換為大寫，作為環境變數的一部分
  const envKey = promptKey.toUpperCase();

  // 檢查是否有替換模式的環境變數
  const overrideEnvVar = `MCP_PROMPT_${envKey}`;
  if (process.env[overrideEnvVar]) {
    // 使用環境變數完全替換原始 prompt
    return processEnvString(process.env[overrideEnvVar]);
  }

  // 檢查是否有追加模式的環境變數
  const appendEnvVar = `MCP_PROMPT_${envKey}_APPEND`;
  if (process.env[appendEnvVar]) {
    // 將環境變數內容追加到原始 prompt 後
    return `${basePrompt}\n\n${processEnvString(process.env[appendEnvVar])}`;
  }

  // 如果沒有自定義，則使用原始 prompt
  return basePrompt;
}

/**
 * 檢測模板是否包含 Handlebars 語法
 */
function isHandlebarsTemplate(templateContent: string): boolean {
  return /\{\{[^}]+\}\}/.test(templateContent);
}

/**
 * Helper function to safely access nested properties
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? current[key] : undefined;
  }, obj);
}

/**
 * Math helper functions for Handlebars
 */
const mathHelpers = {
  add: (a: number, b: number) => Number(a) + Number(b),
  subtract: (a: number, b: number) => Number(a) - Number(b),
  multiply: (a: number, b: number) => Number(a) * Number(b),
  divide: (a: number, b: number) => Number(b) !== 0 ? Number(a) / Number(b) : 0,
  gt: (a: number, b: number) => Number(a) > Number(b),
  gte: (a: number, b: number) => Number(a) >= Number(b),
  lt: (a: number, b: number) => Number(a) < Number(b),
  lte: (a: number, b: number) => Number(a) <= Number(b),
  eq: (a: any, b: any) => a === b,
  ne: (a: any, b: any) => a !== b,
};

/**
 * 同步處理基本的 Handlebars 模板語法
 */
function processHandlebarsSync(template: string, params: Record<string, any>): string {
  let result = template;
  
  // Handle {{#each array}} loops first (before simple variable replacement)
  result = result.replace(/\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayName, content) => {
    const array = params[arrayName];
    if (Array.isArray(array) && array.length > 0) {
      return array.map(item => {
        let itemContent = content;
        
        // Process variables within the item context
        if (typeof item === 'object' && item !== null) {
          // First handle conditional blocks within the each loop
          itemContent = itemContent.replace(/\{\{#if (\w+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g, (ifMatch: string, condition: string, ifContent: string, elseContent: string = '') => {
            const conditionValue = item[condition];
            const boolValue = conditionValue !== undefined && conditionValue !== null && conditionValue !== false && conditionValue !== 0 && conditionValue !== '';
            return boolValue ? ifContent : elseContent;
          });
          
          // Handle simple properties
          Object.entries(item).forEach(([key, value]) => {
            const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            itemContent = itemContent.replace(placeholder, String(value || ''));
          });
          
          // Handle parent context access (../variable)
          itemContent = itemContent.replace(/\{\{\.\.\/(\w+)\}\}/g, (match: string, parentKey: string) => {
            return String(params[parentKey] || '');
          });
        }
        
        return itemContent;
      }).join('');
    }
    return '';
  });
  
  // Handle {{#if condition}} blocks with nested properties and helper functions
  result = result.replace(/\{\{#if (.+?)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g, (match, condition, ifContent, elseContent = '') => {
    let value;
    
    // Check for helper function calls like (gt a b)
    const helperMatch = condition.match(/^\(([a-z]+)\s+(.+?)\s+(.+?)\)$/);
    if (helperMatch) {
      const [, helper, arg1, arg2] = helperMatch;
      if (helper in mathHelpers) {
        const val1 = getNestedValue(params, arg1.trim()) ?? arg1;
        const val2 = getNestedValue(params, arg2.trim()) ?? arg2;
        value = (mathHelpers as any)[helper](val1, val2);
      }
    } else {
      // Handle nested properties and simple variables
      const conditionTrimmed = condition.trim();
      value = getNestedValue(params, conditionTrimmed);
      // If value is undefined, check if it's a direct property
      if (value === undefined) {
        value = params[conditionTrimmed];
      }
    }
    
    // Convert value to boolean for conditional logic
    const boolValue = value !== undefined && value !== null && value !== false && value !== 0 && value !== '';
    return boolValue ? ifContent : elseContent;
  });
  
  // Handle {{#unless condition}} blocks
  result = result.replace(/\{\{#unless (\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g, (match, condition, content) => {
    const value = params[condition];
    return !value ? content : '';
  });
  
  // Handle {{#unless (eq var value)}} blocks
  result = result.replace(/\{\{#unless \(eq (\w+) (\d+)\)\}\}([\s\S]*?)\{\{\/unless\}\}/g, (match, varName, value, content) => {
    const varValue = params[varName];
    const compareValue = parseInt(value);
    return varValue !== compareValue ? content : '';
  });
  
  // Handle {{#if (eq var value)}} blocks
  result = result.replace(/\{\{#if \(eq (\w+) (\d+)\)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, varName, value, content) => {
    const varValue = params[varName];
    const compareValue = parseInt(value);
    return varValue === compareValue ? content : '';
  });
  
  // Handle math helper functions {{multiply a b}}, {{add a b}}, etc.
  result = result.replace(/\{\{(add|subtract|multiply|divide)\s+(.+?)\s+(.+?)\}\}/g, (match, helper, arg1, arg2) => {
    const val1 = getNestedValue(params, arg1.trim()) ?? Number(arg1);
    const val2 = getNestedValue(params, arg2.trim()) ?? Number(arg2);
    const mathFunc = mathHelpers[helper as keyof typeof mathHelpers];
    if (typeof mathFunc === 'function' && helper !== 'gt' && helper !== 'gte' && helper !== 'lt' && helper !== 'lte' && helper !== 'eq' && helper !== 'ne') {
      return String(mathFunc(val1, val2));
    }
    return match;
  });
  
  // Handle simple variables {{variable}} including nested properties - do this last
  result = result.replace(/\{\{([^}#\/]+?)\}\}/g, (match, varPath) => {
    const trimmedPath = varPath.trim();
    
    // Skip if it's a helper function
    if (trimmedPath.includes(' ')) return match;
    
    const value = getNestedValue(params, trimmedPath);
    return value !== undefined ? String(value) : '';
  });
  
  return result;
}

/**
 * 生成包含動態參數的 prompt（同步版本）
 * @param promptTemplate prompt 模板
 * @param params 動態參數
 * @returns 填充參數後的 prompt
 */
export function generatePrompt(
  promptTemplate: string,
  params: Record<string, any> = {}
): string {
  // Check if this is a Handlebars template
  if (isHandlebarsTemplate(promptTemplate)) {
    // Use Handlebars processing exclusively
    return processHandlebarsSync(promptTemplate, params);
  }

  // Simple template replacement using {variable} format (not {{variable}})
  // This path is only used for non-Handlebars templates
  let result = promptTemplate;

  Object.entries(params).forEach(([key, value]) => {
    // 如果值為 undefined 或 null，使用空字串替換
    const replacementValue =
      value !== undefined && value !== null ? String(value) : "";

    // 使用正則表達式替換所有匹配的佔位符 (single braces {variable})
    const placeholder = new RegExp(`\\{${key}\\}`, "g");
    result = result.replace(placeholder, replacementValue);
  });

  return result;
}

/**
 * 從模板載入 prompt（同步版本）
 * @param templatePath 相對於模板集根目錄的模板路徑 (e.g., 'chat/basic.md')
 * @param variables 模板變數，用於替換模板中的占位符
 * @returns 模板內容
 * @throws Error 如果找不到模板文件
 */
export function loadPromptFromTemplate(
  templatePath: string,
  variables: Record<string, any> = {}
): string {
  const templateSetName = process.env.TEMPLATES_USE || "en";
  const dataDir = process.env.DATA_DIR;
  const builtInTemplatesBaseDir = __dirname;

  let finalPath = "";
  const checkedPaths: string[] = []; // 用於更詳細的錯誤報告

  // 1. 檢查 DATA_DIR 中的通用自定義路徑
  if (dataDir) {
    const customFilePath = path.resolve(dataDir, templateSetName, templatePath);
    checkedPaths.push(`Custom: ${customFilePath}`);
    if (fs.existsSync(customFilePath)) {
      finalPath = customFilePath;
    }
  }

  // 2. 如果未找到自定義路徑，檢查特定的內建模板目錄
  if (!finalPath) {
    const specificBuiltInFilePath = path.join(
      builtInTemplatesBaseDir,
      `templates_${templateSetName}`,
      templatePath
    );
    checkedPaths.push(`Specific Built-in: ${specificBuiltInFilePath}`);
    if (fs.existsSync(specificBuiltInFilePath)) {
      finalPath = specificBuiltInFilePath;
    }
  }

  // 3. 如果特定的內建模板也未找到，且不是 'en' (避免重複檢查)
  if (!finalPath && templateSetName !== "en") {
    const defaultBuiltInFilePath = path.join(
      builtInTemplatesBaseDir,
      "templates_en",
      templatePath
    );
    checkedPaths.push(`Default Built-in ('en'): ${defaultBuiltInFilePath}`);
    if (fs.existsSync(defaultBuiltInFilePath)) {
      finalPath = defaultBuiltInFilePath;
    }
  }

  // 4. 如果所有路徑都找不到模板，拋出錯誤
  if (!finalPath) {
    let errorMessage = `Template file not found: '${templatePath}' in template set '${templateSetName}'`;
    
    errorMessage += `.\n\nChecked paths:\n - ${checkedPaths.join("\n - ")}`;
    
    // 提供有用的建議
    if (dataDir) {
      const recommendedPath = path.resolve(dataDir, templateSetName, templatePath);
      errorMessage += `\n\nℹ️ To create custom templates, create the file at:\n   ${recommendedPath}`;
    }
    
    throw new Error(errorMessage);
  }

  // 5. 讀取找到的文件並應用變數替換
  const templateContent = fs.readFileSync(finalPath, "utf-8");
  
  // 6. Apply variable replacement if variables are provided
  if (Object.keys(variables).length > 0) {
    return generatePrompt(templateContent, variables);
  }
  
  // 7. Return template as-is if no variables
  return templateContent;
}
