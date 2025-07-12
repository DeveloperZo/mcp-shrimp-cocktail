import path from "path";
import { fileURLToPath } from "url";

// Get current file path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root directory (src directory)
const PROJECT_ROOT = path.dirname(__dirname);

/**
 * Get the project root directory
 * @returns The absolute path to the project root (src directory)
 */
export function getProjectRoot(): string {
  return PROJECT_ROOT;
}

/**
 * Get the data directory path
 * @returns The absolute path to the data directory
 */
export function getDataDir(): string {
  return process.env.DATA_DIR || path.join(PROJECT_ROOT, "data");
}

/**
 * Get the public directory path for static files
 * @returns The absolute path to the public directory
 */
export function getPublicPath(): string {
  return path.join(PROJECT_ROOT, "public");
}

/**
 * Get the legacy tasks file path (for backwards compatibility)
 * @returns The absolute path to the legacy tasks.json file
 */
export function getTasksFilePath(): string {
  return path.join(getDataDir(), "tasks.json");
}

/**
 * Get the projects configuration file path
 * @returns The absolute path to the projects.json file
 */
export function getProjectsFilePath(): string {
  return path.join(getDataDir(), "projects.json");
}

/**
 * Get the WebGUI markdown file path
 * @returns The absolute path to the WebGUI.md file
 */
export function getWebGuiFilePath(): string {
  return path.join(getDataDir(), "WebGUI.md");
}

/**
 * Get a project-specific directory path
 * @param projectName The name of the project
 * @returns The absolute path to the project's directory
 */
export function getProjectDir(projectName: string): string {
  return path.join(getDataDir(), "projects", projectName);
}

/**
 * Get a project-specific tasks file path
 * @param projectName The name of the project
 * @param planName The name of the plan (optional, defaults to 'default')
 * @returns The absolute path to the project's tasks file
 */
export function getProjectTasksFilePath(projectName: string, planName: string = 'default'): string {
  return path.join(getProjectDir(projectName), "plans", planName, "tasks.json");
}

/**
 * Get a project's plans directory path
 * @param projectName The name of the project
 * @returns The absolute path to the project's plans directory
 */
export function getProjectPlansDir(projectName: string): string {
  return path.join(getProjectDir(projectName), "plans");
}

/**
 * Get a specific plan's directory path
 * @param projectName The name of the project
 * @param planName The name of the plan
 * @returns The absolute path to the specific plan's directory
 */
export function getPlanDir(projectName: string, planName: string): string {
  return path.join(getProjectPlansDir(projectName), planName);
}
