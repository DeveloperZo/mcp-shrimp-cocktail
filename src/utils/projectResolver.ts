/**
 * Project Resolution Utilities
 * 
 * Centralized project resolution helper functions to standardize how project names/IDs 
 * are resolved across the application. Provides consistent error handling for invalid 
 * project references and improved user guidance when projects are not found.
 */

import { projectManager } from "../models/projectModel.js";
import { ProjectMetadata, ProjectResolutionResult, ProjectValidationResult, ProjectResolutionOptions } from "../types/index.js";
import { sanitizeProjectName, validateProjectName } from "./projectNaming.js";

/**
 * Regular expression to detect UUID format
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Default resolution options
 */
const DEFAULT_RESOLUTION_OPTIONS: Required<ProjectResolutionOptions> = {
  allowDefaultFallback: false,
  caseInsensitive: true,
  includeSuggestions: true,
  maxSuggestions: 3,
};

/**
 * Resolves a project identifier (ID, name, or sanitized name) to a ProjectMetadata object.
 * Provides comprehensive error handling and user guidance for failed resolutions.
 * 
 * @param projectIdentifier - The project ID, name, or sanitized name to resolve
 * @param options - Options to customize resolution behavior
 * @returns Promise containing the resolution result
 */
export async function resolveProject(
  projectIdentifier: string | null | undefined,
  options: ProjectResolutionOptions = {}
): Promise<ProjectResolutionResult> {
  const opts = { ...DEFAULT_RESOLUTION_OPTIONS, ...options };

  try {
    // Initialize project manager if not already done
    await projectManager.initialize();

    // Handle null/undefined/empty identifier - require explicit project
    if (!projectIdentifier || projectIdentifier.trim() === '') {
      const availableProjects = await projectManager.listProjects();
      return {
        success: false,
        project: null,
        resolvedId: null,
        matchedBy: null,
        error: "Project identifier is required. Please specify a project name or ID.",
        suggestions: opts.includeSuggestions 
          ? availableProjects.slice(0, opts.maxSuggestions).map(p => p.name)
          : undefined,
      };
    }

    const trimmedIdentifier = projectIdentifier.trim();
    const availableProjects = await projectManager.listProjects();

    // First, try exact matches (case-sensitive)
    let project = findProjectByExactMatch(availableProjects, trimmedIdentifier);
    if (project.found) {
      return {
        success: true,
        project: project.project!,
        resolvedId: project.project!.id,
        matchedBy: project.matchedBy!,
      };
    }

    // If case-insensitive matching is enabled, try that
    if (opts.caseInsensitive) {
      project = findProjectByCaseInsensitiveMatch(availableProjects, trimmedIdentifier);
      if (project.found) {
        return {
          success: true,
          project: project.project!,
          resolvedId: project.project!.id,
          matchedBy: project.matchedBy!,
        };
      }
    }

    // Project not found - prepare error response with suggestions
    const suggestions = opts.includeSuggestions
      ? generateProjectSuggestions(availableProjects, trimmedIdentifier, opts.maxSuggestions)
      : undefined;

    const errorMessage = buildProjectNotFoundError(
      trimmedIdentifier,
      availableProjects,
      suggestions
    );

    return {
      success: false,
      project: null,
      resolvedId: null,
      matchedBy: null,
      error: errorMessage,
      suggestions,
    };

  } catch (error) {
    return {
      success: false,
      project: null,
      resolvedId: null,
      matchedBy: null,
      error: `Failed to resolve project: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Validates a project identifier format and provides detailed feedback
 * 
 * @param identifier - The project identifier to validate
 * @returns Validation result with detailed information
 */
export function validateProjectIdentifier(identifier: string): ProjectValidationResult {
  const errors: string[] = [];
  
  if (!identifier || typeof identifier !== 'string') {
    return {
      isValid: false,
      errors: ['Project identifier is required and must be a string'],
      isUuid: false,
      isProjectName: false,
    };
  }

  const trimmed = identifier.trim();
  
  if (trimmed.length === 0) {
    return {
      isValid: false,
      errors: ['Project identifier cannot be empty'],
      isUuid: false,
      isProjectName: false,
    };
  }

  const isUuid = UUID_REGEX.test(trimmed);
  const isProjectName = !isUuid;

  // If it looks like a UUID, validate UUID format
  if (isUuid) {
    return {
      isValid: true,
      errors: [],
      isUuid: true,
      isProjectName: false,
    };
  }

  // If it looks like a project name, validate project name format
  const nameValidation = validateProjectName(trimmed);
  
  return {
    isValid: nameValidation.isValid,
    errors: nameValidation.errors,
    sanitizedName: nameValidation.sanitizedName,
    isUuid: false,
    isProjectName: true,
  };
}

/**
 * Resolves multiple project identifiers in batch
 * 
 * @param identifiers - Array of project identifiers to resolve
 * @param options - Resolution options
 * @returns Array of resolution results
 */
export async function resolveProjects(
  identifiers: (string | null | undefined)[],
  options: ProjectResolutionOptions = {}
): Promise<ProjectResolutionResult[]> {
  const results: ProjectResolutionResult[] = [];
  
  for (const identifier of identifiers) {
    const result = await resolveProject(identifier, options);
    results.push(result);
  }
  
  return results;
}

/**
 * Checks if a project exists by identifier
 * 
 * @param projectIdentifier - The project identifier to check
 * @returns Promise indicating whether the project exists
 */
export async function projectExists(projectIdentifier: string): Promise<boolean> {
  const result = await resolveProject(projectIdentifier);
  return result.success;
}

/**
 * Gets all available project names for reference
 * 
 * @returns Promise containing array of all project names
 */
export async function getAvailableProjectNames(): Promise<string[]> {
  try {
    await projectManager.initialize();
    const projects = await projectManager.listProjects();
    return projects.map(p => p.name);
  } catch (error) {
    return [];
  }
}

/**
 * Helper function to find projects by exact match
 */
function findProjectByExactMatch(
  projects: ProjectMetadata[],
  identifier: string
): { found: boolean; project?: ProjectMetadata; matchedBy?: 'id' | 'name' | 'sanitizedName' } {
  // Try ID match first (most specific)
  let project = projects.find(p => p.id === identifier);
  if (project) {
    return { found: true, project, matchedBy: 'id' };
  }

  // Try name match
  project = projects.find(p => p.name === identifier);
  if (project) {
    return { found: true, project, matchedBy: 'name' };
  }

  // Try sanitized name match
  project = projects.find(p => p.sanitizedName === identifier);
  if (project) {
    return { found: true, project, matchedBy: 'sanitizedName' };
  }

  return { found: false };
}

/**
 * Helper function to find projects by case-insensitive match
 */
function findProjectByCaseInsensitiveMatch(
  projects: ProjectMetadata[],
  identifier: string
): { found: boolean; project?: ProjectMetadata; matchedBy?: 'id' | 'name' | 'sanitizedName' } {
  const lowerIdentifier = identifier.toLowerCase();

  // Try name match (case-insensitive)
  let project = projects.find(p => p.name.toLowerCase() === lowerIdentifier);
  if (project) {
    return { found: true, project, matchedBy: 'name' };
  }

  // Try sanitized name match (case-insensitive)
  project = projects.find(p => p.sanitizedName.toLowerCase() === lowerIdentifier);
  if (project) {
    return { found: true, project, matchedBy: 'sanitizedName' };
  }

  return { found: false };
}

/**
 * Generates project suggestions based on similarity to the input
 */
function generateProjectSuggestions(
  projects: ProjectMetadata[],
  identifier: string,
  maxSuggestions: number
): string[] {
  const lowerIdentifier = identifier.toLowerCase();
  
  // Score projects by similarity
  const scored = projects.map(project => ({
    project,
    score: calculateSimilarity(lowerIdentifier, project.name.toLowerCase()),
  }));

  // Sort by score (descending) and take top suggestions
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSuggestions)
    .filter(item => item.score > 0) // Only include items with some similarity
    .map(item => item.project.name);
}

/**
 * Calculates similarity score between two strings (simple algorithm)
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;

  // Check for substring matches
  if (str2.includes(str1) || str1.includes(str2)) {
    return 0.8;
  }

  // Check for common prefix
  let commonPrefix = 0;
  const minLength = Math.min(str1.length, str2.length);
  for (let i = 0; i < minLength; i++) {
    if (str1[i] === str2[i]) {
      commonPrefix++;
    } else {
      break;
    }
  }

  if (commonPrefix > 0) {
    return 0.5 + (commonPrefix / Math.max(str1.length, str2.length)) * 0.3;
  }

  return 0.0;
}

/**
 * Builds a comprehensive error message for project not found scenarios
 */
function buildProjectNotFoundError(
  identifier: string,
  availableProjects: ProjectMetadata[],
  suggestions?: string[]
): string {
  let error = `Project "${identifier}" not found.`;

  if (availableProjects.length === 0) {
    error += ' No projects are currently available.';
  } else {
    error += ` Available projects: ${availableProjects.map(p => p.name).join(", ")}.`;
    
    if (suggestions && suggestions.length > 0) {
      error += ` Did you mean: ${suggestions.join(", ")}?`;
    }
  }

  return error;
}

/**
 * Convenience function to resolve project and throw error if not found
 * Useful for tools that require a valid project
 * 
 * @param projectIdentifier - The project identifier to resolve
 * @param options - Resolution options
 * @returns Promise containing the resolved project metadata
 * @throws Error if project cannot be resolved
 */
export async function requireProject(
  projectIdentifier: string,
  options: ProjectResolutionOptions = {}
): Promise<ProjectMetadata> {
  const result = await resolveProject(projectIdentifier, options);
  
  if (!result.success) {
    throw new Error(result.error || `Failed to resolve project: ${projectIdentifier}`);
  }
  
  return result.project!;
}

/**
 * Resolves project and returns the project ID
 * Useful when you only need the ID and want to handle errors gracefully
 * 
 * @param projectIdentifier - The project identifier to resolve
 * @param options - Resolution options
 * @returns Promise containing the resolved project ID or null
 */
export async function resolveProjectId(
  projectIdentifier: string,
  options: ProjectResolutionOptions = {}
): Promise<string | null> {
  const result = await resolveProject(projectIdentifier, options);
  return result.resolvedId;
}

/**
 * Type guard to check if a string is a valid UUID
 * 
 * @param value - The string to check
 * @returns True if the string is a valid UUID
 */
export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Normalizes a project identifier for consistent comparison
 * 
 * @param identifier - The identifier to normalize
 * @returns Normalized identifier
 */
export function normalizeProjectIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}
