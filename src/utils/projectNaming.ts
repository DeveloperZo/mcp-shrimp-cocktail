/**
 * Project Naming Utilities
 * 
 * Provides file-safe project naming, validation, and sanitization utilities
 * to ensure project names work across all filesystems and platforms.
 */

export interface ProjectNameValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedName?: string;
}

/**
 * Characters that are invalid in filenames across different filesystems
 * Includes Windows reserved characters, Unix special characters, and Unicode issues
 */
const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1f\x7f-\x9f]/g;

/**
 * Reserved names in Windows filesystems
 */
const WINDOWS_RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
]);

/**
 * Maximum length for project names to ensure filesystem compatibility
 */
const MAX_PROJECT_NAME_LENGTH = 50;

/**
 * Minimum length for project names
 */
const MIN_PROJECT_NAME_LENGTH = 1;

/**
 * Sanitizes a project name to ensure it's safe for use as a filesystem directory name
 * 
 * @param name - The raw project name to sanitize
 * @returns A sanitized, file-safe project name
 */
export function sanitizeProjectName(name: string): string {
  if (!name || typeof name !== 'string') {
    return 'untitled-project';
  }

  // Convert to lowercase for consistency
  let sanitized = name.toLowerCase();

  // Replace invalid filesystem characters with hyphens
  sanitized = sanitized.replace(INVALID_FILENAME_CHARS, '-');

  // Replace whitespace and other problematic characters with hyphens
  sanitized = sanitized.replace(/[\s\t\n\r]+/g, '-');

  // Replace dots at the beginning or end (problematic on some systems)
  sanitized = sanitized.replace(/^\.+|\.+$/g, '-');

  // Handle Unicode normalization (NFD to NFC)
  sanitized = sanitized.normalize('NFC');

  // Collapse multiple hyphens into single hyphens
  sanitized = sanitized.replace(/-+/g, '-');

  // Remove leading and trailing hyphens
  sanitized = sanitized.replace(/^-+|-+$/g, '');

  // Ensure we don't have an empty string
  if (!sanitized) {
    sanitized = 'untitled-project';
  }

  // Limit to maximum length
  if (sanitized.length > MAX_PROJECT_NAME_LENGTH) {
    sanitized = sanitized.substring(0, MAX_PROJECT_NAME_LENGTH);
    // Remove trailing hyphen if truncation created one
    sanitized = sanitized.replace(/-+$/, '');
  }

  // Check if the name conflicts with Windows reserved names
  if (WINDOWS_RESERVED_NAMES.has(sanitized.toUpperCase())) {
    sanitized = `${sanitized}-project`;
  }

  // Final safety check - if still empty or invalid, use default
  if (!sanitized || sanitized.length < MIN_PROJECT_NAME_LENGTH) {
    sanitized = 'untitled-project';
  }

  return sanitized;
}

/**
 * Validates a project name and provides detailed feedback
 * 
 * @param name - The project name to validate
 * @returns Validation result with errors and suggestions
 */
export function validateProjectName(name: string): ProjectNameValidationResult {
  const errors: string[] = [];
  
  // Check if name is provided
  if (!name || typeof name !== 'string') {
    errors.push('Project name is required and must be a string');
    return {
      isValid: false,
      errors,
      sanitizedName: sanitizeProjectName(name)
    };
  }

  const trimmedName = name.trim();

  // Check minimum length
  if (trimmedName.length < MIN_PROJECT_NAME_LENGTH) {
    errors.push(`Project name must be at least ${MIN_PROJECT_NAME_LENGTH} character long`);
  }

  // Check maximum length
  if (trimmedName.length > MAX_PROJECT_NAME_LENGTH) {
    errors.push(`Project name must be no longer than ${MAX_PROJECT_NAME_LENGTH} characters`);
  }

  // Check for invalid characters
  if (INVALID_FILENAME_CHARS.test(trimmedName)) {
    errors.push('Project name contains invalid characters (<>:"/\\|?* or control characters)');
  }

  // Check for leading/trailing whitespace
  if (trimmedName !== name) {
    errors.push('Project name cannot have leading or trailing whitespace');
  }

  // Check for leading/trailing dots
  if (/^\.|\.$/.test(trimmedName)) {
    errors.push('Project name cannot start or end with a dot');
  }

  // Check for Windows reserved names
  if (WINDOWS_RESERVED_NAMES.has(trimmedName.toUpperCase())) {
    errors.push(`"${trimmedName}" is a reserved system name and cannot be used`);
  }

  // Check for only special characters
  if (/^[-\s.]+$/.test(trimmedName)) {
    errors.push('Project name cannot consist only of special characters, spaces, or dots');
  }

  // Check for consecutive dots or hyphens that might cause issues
  if (/\.{2,}|--/.test(trimmedName)) {
    errors.push('Project name cannot contain consecutive dots (..) or hyphens (--)');
  }

  const sanitizedName = sanitizeProjectName(name);
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedName
  };
}

/**
 * Checks if a project name is already sanitized and valid
 * 
 * @param name - The project name to check
 * @returns True if the name is already properly sanitized
 */
export function isProjectNameSanitized(name: string): boolean {
  const sanitized = sanitizeProjectName(name);
  return name === sanitized && validateProjectName(name).isValid;
}

/**
 * Generates a unique project name by appending a number if needed
 * 
 * @param baseName - The base name to make unique
 * @param existingNames - Set of existing project names to avoid conflicts
 * @returns A unique project name
 */
export function generateUniqueProjectName(
  baseName: string, 
  existingNames: Set<string>
): string {
  const sanitizedBase = sanitizeProjectName(baseName);
  
  if (!existingNames.has(sanitizedBase)) {
    return sanitizedBase;
  }

  let counter = 1;
  let uniqueName: string;
  
  do {
    const suffix = `-${counter}`;
    const maxBaseLength = MAX_PROJECT_NAME_LENGTH - suffix.length;
    const truncatedBase = sanitizedBase.length > maxBaseLength 
      ? sanitizedBase.substring(0, maxBaseLength).replace(/-+$/, '')
      : sanitizedBase;
    
    uniqueName = `${truncatedBase}${suffix}`;
    counter++;
  } while (existingNames.has(uniqueName) && counter < 1000); // Safety limit
  
  return uniqueName;
}

/**
 * Utility function to normalize project names for comparison
 * 
 * @param name - The project name to normalize
 * @returns Normalized name for case-insensitive comparison
 */
export function normalizeProjectNameForComparison(name: string): string {
  return name.toLowerCase().trim().normalize('NFC');
}
