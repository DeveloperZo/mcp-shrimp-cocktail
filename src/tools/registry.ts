/**
 * Tool Registry for MCP Server
 * Centralized registration and management of all MCP tools
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";

/**
 * Tool definition interface
 */
export interface ToolDefinition {
  schema: z.ZodSchema;
  handler: (args: any) => Promise<CallToolResult | { content: Array<{ type: string; text: string }> }>;
  description?: string;
}

/**
 * Tool Registry Class
 * Manages registration and retrieval of MCP tools
 */
export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  /**
   * Register a tool with the registry
   */
  register(name: string, definition: ToolDefinition): void {
    this.tools.set(name, definition);
  }

  /**
   * Get a tool definition by name
   */
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool is registered
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all registered tool names
   */
  list(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get all tool definitions
   */
  getAll(): Map<string, ToolDefinition> {
    return new Map(this.tools);
  }
}

/**
 * Global tool registry instance
 */
export const toolRegistry = new ToolRegistry();

