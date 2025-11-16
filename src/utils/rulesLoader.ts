import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";

/**
 * AI Agent rules folder name
 */
const AI_AGENT_FOLDER_NAME = "AI Agent";

/**
 * Alternative folder names to search for (case-insensitive)
 */
const ALTERNATIVE_FOLDER_NAMES = [
  "AI Agent",
  "ai agent",
  "AI_Agent",
  "ai_agent",
  "AIAgent",
  "aiagent"
];

/**
 * Common locations to search for the AI Agent folder
 */
const SEARCH_LOCATIONS = [
  "", // Project root (will be resolved from process.cwd())
  "assets/doc",
  "assets/docs",
  "docs",
  "doc",
  ".ai",
  "ai"
];

/**
 * Default maximum content size (in characters) to prevent context bloat
 */
const DEFAULT_MAX_CONTENT_SIZE = 50000; // ~50k characters

/**
 * Options for loading AI Agent rules
 */
export interface RulesLoadOptions {
  /**
   * Maximum total content size in characters (default: 50000)
   * If exceeded, content will be truncated with a warning
   */
  maxContentSize?: number;
  
  /**
   * Maximum size per file in characters (default: no limit)
   * Files exceeding this will be truncated
   */
  maxFileSize?: number;
  
  /**
   * Whether to cache the loaded rules (default: true)
   * Cached rules are reused until folder modification time changes
   */
  useCache?: boolean;
  
  /**
   * Specific files to load (by name). If provided, only these files are loaded
   * If not provided, all .md files are loaded
   */
  fileFilter?: string[];
  
  /**
   * Whether to include file headers in combined content (default: true)
   */
  includeFileHeaders?: boolean;
}

/**
 * Result of loading AI Agent rules
 */
export interface RulesLoadResult {
  success: boolean;
  rulesContent: string;
  folderPath: string | null;
  filesLoaded: string[];
  totalSize: number;
  wasTruncated: boolean;
  error?: string;
}

/**
 * Cache entry for loaded rules
 */
interface CacheEntry {
  content: string;
  filesLoaded: string[];
  folderPath: string;
  folderModTime: number;
  totalSize: number;
  wasTruncated: boolean;
}

/**
 * In-memory cache for loaded rules
 * Key: folder path, Value: cached content
 */
const rulesCache = new Map<string, CacheEntry>();

/**
 * Find the AI Agent folder in the project
 * Searches in common locations with case-insensitive matching
 */
export async function findAiAgentFolder(projectRoot?: string): Promise<string | null> {
  const rootDir = projectRoot || process.cwd();
  
  // Try each search location
  for (const searchLocation of SEARCH_LOCATIONS) {
    const basePath = searchLocation ? path.join(rootDir, searchLocation) : rootDir;
    
    if (!fs.existsSync(basePath)) {
      continue;
    }
    
    // List directory contents
    try {
      const entries = await fsPromises.readdir(basePath, { withFileTypes: true });
      
      // Check for folder with matching name (case-insensitive)
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const folderName = entry.name;
          const matches = ALTERNATIVE_FOLDER_NAMES.some(
            altName => folderName.toLowerCase() === altName.toLowerCase()
          );
          
          if (matches) {
            const fullPath = path.join(basePath, folderName);
            return fullPath;
          }
        }
      }
    } catch (error) {
      // Continue searching if directory read fails
      continue;
    }
  }
  
  return null;
}

/**
 * Get folder modification time for cache invalidation
 */
async function getFolderModTime(folderPath: string): Promise<number> {
  try {
    const stats = await fsPromises.stat(folderPath);
    return stats.mtimeMs;
  } catch {
    return 0;
  }
}

/**
 * Load all markdown files from the AI Agent folder
 * Files are sorted alphabetically and combined with separators
 * Supports caching and content size limits to prevent context bloat
 */
export async function loadAiAgentRules(
  projectRoot?: string,
  options: RulesLoadOptions = {}
): Promise<RulesLoadResult> {
  try {
    const {
      maxContentSize = DEFAULT_MAX_CONTENT_SIZE,
      maxFileSize,
      useCache = true,
      fileFilter,
      includeFileHeaders = true
    } = options;

    // Find the AI Agent folder
    const folderPath = await findAiAgentFolder(projectRoot);
    
    if (!folderPath) {
      return {
        success: false,
        rulesContent: "",
        folderPath: null,
        filesLoaded: [],
        totalSize: 0,
        wasTruncated: false,
        error: `AI Agent folder not found. Searched in: ${SEARCH_LOCATIONS.join(", ")}`
      };
    }
    
    // Verify folder exists and is readable
    if (!fs.existsSync(folderPath)) {
      return {
        success: false,
        rulesContent: "",
        folderPath,
        filesLoaded: [],
        totalSize: 0,
        wasTruncated: false,
        error: `AI Agent folder found but does not exist: ${folderPath}`
      };
    }

    // Check cache if enabled
    // Note: Cache key includes options that affect output, but not all options
    // Size limits and headers affect output, so we include them in cache key
    if (useCache) {
      const cacheKey = `${folderPath}:${fileFilter?.join(",") || "all"}:${maxContentSize}:${maxFileSize || "none"}:${includeFileHeaders}`;
      const cached = rulesCache.get(cacheKey);
      
      if (cached) {
        // Check if folder has been modified
        const currentModTime = await getFolderModTime(folderPath);
        if (cached.folderModTime === currentModTime) {
          // Cache is still valid
          return {
            success: true,
            rulesContent: cached.content,
            folderPath: cached.folderPath,
            filesLoaded: cached.filesLoaded,
            totalSize: cached.totalSize,
            wasTruncated: cached.wasTruncated
          };
        } else {
          // Cache invalid, remove it
          rulesCache.delete(cacheKey);
        }
      }
    }
    
    // Read all markdown files from the folder
    const entries = await fsPromises.readdir(folderPath, { withFileTypes: true });
    const markdownFiles: { name: string; path: string }[] = [];
    
    for (const entry of entries) {
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        // Apply file filter if provided
        if (fileFilter && !fileFilter.includes(entry.name)) {
          continue;
        }
        markdownFiles.push({
          name: entry.name,
          path: path.join(folderPath, entry.name)
        });
      }
    }
    
    // Sort files alphabetically for consistent ordering
    markdownFiles.sort((a, b) => a.name.localeCompare(b.name));
    
    if (markdownFiles.length === 0) {
      return {
        success: false,
        rulesContent: "",
        folderPath,
        filesLoaded: [],
        totalSize: 0,
        wasTruncated: false,
        error: `No markdown files found in AI Agent folder: ${folderPath}`
      };
    }
    
    // Read and combine all markdown files with size limits
    const fileContents: string[] = [];
    const filesLoaded: string[] = [];
    let totalSize = 0;
    let wasTruncated = false;
    
    for (const file of markdownFiles) {
      // Check if we've already exceeded the limit
      if (totalSize >= maxContentSize) {
        wasTruncated = true;
        break;
      }
      
      try {
        let content = await fsPromises.readFile(file.path, "utf-8");
        const originalSize = content.length;
        
        // Apply per-file size limit if specified
        if (maxFileSize && content.length > maxFileSize) {
          content = content.substring(0, maxFileSize) + `\n\n*[File truncated: original size ${originalSize} characters, limit ${maxFileSize}]*`;
          wasTruncated = true;
        }
        
        // Check if adding this file would exceed total limit
        const fileHeader = includeFileHeaders ? `# ${file.name}\n\n` : "";
        const fileContent = fileHeader + content;
        const separator = fileContents.length > 0 ? "\n\n---\n\n" : "";
        const wouldExceed = totalSize + separator.length + fileContent.length > maxContentSize;
        
        if (wouldExceed) {
          // Truncate this file to fit within remaining space
          const remainingSpace = maxContentSize - totalSize - separator.length - fileHeader.length;
          if (remainingSpace > 100) { // Only include if there's meaningful space
            content = content.substring(0, remainingSpace - 50) + `\n\n*[Content truncated due to size limit]*`;
            const truncatedContent = fileHeader + content;
            fileContents.push(truncatedContent);
            filesLoaded.push(file.name);
            totalSize += separator.length + truncatedContent.length;
            wasTruncated = true;
          }
          break;
        }
        
        // Add file content
        fileContents.push(fileContent);
        filesLoaded.push(file.name);
        totalSize += separator.length + fileContent.length;
        
      } catch (error) {
        // Skip files that can't be read, but log the error
        const errorMsg = error instanceof Error ? error.message : String(error);
        const errorContent = includeFileHeaders 
          ? `# ${file.name}\n\n*Error loading file: ${errorMsg}*`
          : `*Error loading ${file.name}: ${errorMsg}*`;
        fileContents.push(errorContent);
        filesLoaded.push(`${file.name} (error)`);
        totalSize += errorContent.length;
      }
    }
    
    // Combine all files with clear separators
    const combinedContent = fileContents.join("\n\n---\n\n");
    
    // Add truncation warning if content was truncated
    const finalContent = wasTruncated
      ? combinedContent + `\n\n---\n\n*[Note: Some content was truncated to stay within size limits. Total loaded: ${totalSize} characters, limit: ${maxContentSize}]*`
      : combinedContent;
    
    const result: RulesLoadResult = {
      success: true,
      rulesContent: finalContent,
      folderPath,
      filesLoaded,
      totalSize: finalContent.length,
      wasTruncated
    };

    // Cache the result if caching is enabled
    if (useCache) {
      const cacheKey = `${folderPath}:${fileFilter?.join(",") || "all"}:${maxContentSize}:${maxFileSize || "none"}:${includeFileHeaders}`;
      const folderModTime = await getFolderModTime(folderPath);
      rulesCache.set(cacheKey, {
        content: finalContent,
        filesLoaded,
        folderPath,
        folderModTime,
        totalSize: finalContent.length,
        wasTruncated
      });
    }
    
    return result;
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      rulesContent: "",
      folderPath: null,
      filesLoaded: [],
      totalSize: 0,
      wasTruncated: false,
      error: `Error loading AI Agent rules: ${errorMsg}`
    };
  }
}

/**
 * Get AI Agent rules content as a string
 * Returns empty string if rules cannot be loaded
 * Uses default options (caching enabled, 50k char limit)
 */
export async function getAiAgentRulesContent(
  projectRoot?: string,
  options?: RulesLoadOptions
): Promise<string> {
  const result = await loadAiAgentRules(projectRoot, options);
  return result.rulesContent;
}

/**
 * Clear the rules cache
 * Useful when you know rules have been updated externally
 */
export function clearRulesCache(): void {
  rulesCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: rulesCache.size,
    entries: Array.from(rulesCache.keys())
  };
}

