// Server-Sent Events (SSE) notification utilities
// Depends only on types and constants - maintains dependency hierarchy

import type { Response } from "express";
import type { SseUpdateOptions, SseUpdateMessage } from "../types/mcp.js";
import { SSE_CONFIG } from "./constants.js";

/**
 * SSE Client Manager Class
 * Manages connected SSE clients and provides notification interface
 */
export class SseClientManager {
  private sseClients: Response[] = [];

  /**
   * Add a new SSE client to the managed list
   * @param client The Express Response object representing the SSE connection
   */
  addClient(client: Response): void {
    this.sseClients.push(client);
  }

  /**
   * Remove a client from the managed list
   * @param client The Express Response object to remove
   */
  removeClient(client: Response): void {
    this.sseClients = this.sseClients.filter((c) => c !== client);
  }

  /**
   * Clean up disconnected clients from the list
   */
  cleanupDisconnectedClients(): void {
    this.sseClients = this.sseClients.filter((client) => !client.writableEnded);
  }

  /**
   * Get the current number of connected clients
   * @returns Number of active SSE connections
   */
  getClientCount(): number {
    return this.sseClients.length;
  }

  /**
   * Send SSE update to all connected clients - enhanced for project-aware updates
   * @param options Update options including project ID, update type, action, and data
   */
  sendSseUpdate(options: SseUpdateOptions = {}): void {
    const { projectId, updateType = 'tasks', action = 'updated', data } = options;
    
    const updateMessage: SseUpdateMessage = {
      timestamp: Date.now(),
      projectId: projectId || null,
      updateType,
      action,
      data: data || null
    };
    
    this.sseClients.forEach((client) => {
      // Check if client is still connected
      if (!client.writableEnded) {
        client.write(
          `event: ${SSE_CONFIG.EVENTS.UPDATE}\ndata: ${JSON.stringify(updateMessage)}\n\n`
        );
      }
    });
    
    // Clean up disconnected clients (optional but recommended)
    this.cleanupDisconnectedClients();
  }

  /**
   * Specialized function for project-related updates
   * @param action The action performed (created, updated, deleted)
   * @param projectData Optional project data to include in the update
   */
  sendProjectUpdate(action: 'created' | 'updated' | 'deleted', projectData?: any): void {
    this.sendSseUpdate({
      updateType: 'projects',
      action,
      data: projectData
    });
  }

  /**
   * Function for combined project and task updates
   * @param projectId Optional project ID for the update
   * @param action The action performed (defaults to 'updated')
   */
  sendBothUpdate(projectId?: string, action: 'created' | 'updated' | 'deleted' = 'updated'): void {
    this.sendSseUpdate({
      projectId,
      updateType: 'both',
      action
    });
  }

  /**
   * Send initial connection message to a specific client
   * @param client The client to send the connection message to
   */
  sendConnectionMessage(client: Response): void {
    client.write(`data: ${SSE_CONFIG.EVENTS.CONNECTED}\n\n`);
  }

  /**
   * Set up SSE headers for a client response
   * @param response The Express Response object
   */
  setupSseHeaders(response: Response): void {
    response.writeHead(200, {
      ...SSE_CONFIG.HEADERS,
      // Optional: CORS headers if frontend and backend are on different origins
      // "Access-Control-Allow-Origin": "*",
    });
  }

  /**
   * Handle client connection cleanup
   * @param request The Express Request object
   * @param response The Express Response object
   */
  handleClientConnection(request: any, response: Response): void {
    // Set up SSE headers
    this.setupSseHeaders(response);

    // Send initial connection message
    this.sendConnectionMessage(response);

    // Add client to the list
    this.addClient(response);

    // Handle client disconnection
    request.on("close", () => {
      this.removeClient(response);
    });
  }

  /**
   * Shutdown all SSE connections gracefully
   */
  shutdown(): void {
    this.sseClients.forEach((client) => client.end());
    this.sseClients = [];
  }
}

/**
 * Global SSE client manager instance
 * This provides a singleton pattern for managing SSE connections across the application
 */
export const sseManager = new SseClientManager();

/**
 * Factory function to create SSE update function for model integration
 * Returns a function that can be passed to models for sending notifications
 */
export function createSseNotifier(): (options?: SseUpdateOptions) => void {
  return (options?: SseUpdateOptions) => {
    sseManager.sendSseUpdate(options);
  };
}

/**
 * Express middleware-style SSE endpoint handler
 * Can be used directly as an Express route handler
 */
export function sseEndpointHandler(req: any, res: Response): void {
  sseManager.handleClientConnection(req, res);
}

/**
 * Helper function to create project-specific update notifications
 * @param projectId The project ID
 * @param action The action performed
 * @param data Optional data to include
 */
export function notifyProjectUpdate(
  projectId: string, 
  action: 'created' | 'updated' | 'deleted' = 'updated', 
  data?: any
): void {
  sseManager.sendSseUpdate({
    projectId,
    updateType: 'projects',
    action,
    data
  });
}

/**
 * Helper function to create task-specific update notifications
 * @param projectId The project ID (optional)
 * @param planId The plan ID (optional)
 * @param action The action performed
 * @param data Optional data to include
 */
export function notifyTaskUpdate(
  projectId?: string,
  planId?: string,
  action: 'created' | 'updated' | 'deleted' = 'updated',
  data?: any
): void {
  sseManager.sendSseUpdate({
    projectId,
    updateType: 'tasks',
    action,
    data: { ...data, planId }
  });
}

/**
 * Helper function to create plan-specific update notifications
 * @param projectId The project ID
 * @param action The action performed
 * @param data Optional data to include
 */
export function notifyPlanUpdate(
  projectId: string,
  action: 'created' | 'updated' | 'deleted' = 'updated',
  data?: any
): void {
  sseManager.sendSseUpdate({
    projectId,
    updateType: 'plans',
    action,
    data
  });
}
