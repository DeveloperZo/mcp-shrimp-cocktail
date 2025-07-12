import { EventEmitter } from "events";
import { Task, TaskStatus } from "../types/index.js";

// Event type constants
export const TASK_EVENTS = {
  TASK_CREATED: "task:created",
  TASK_UPDATED: "task:updated", 
  TASK_DELETED: "task:deleted",
  TASK_STATUS_CHANGED: "task:status-changed",
} as const;

// Type for event names
export type TaskEventName = typeof TASK_EVENTS[keyof typeof TASK_EVENTS];

// Base interface for all task events
export interface BaseTaskEvent {
  projectId: string;
  planId: string;
  timestamp: Date;
}

// Event payload interfaces
export interface TaskCreatedEvent extends BaseTaskEvent {
  task: Task;
}

export interface TaskUpdatedEvent extends BaseTaskEvent {
  task: Task;
  previousData?: Partial<Task>;
  changes: string[];
}

export interface TaskDeletedEvent extends BaseTaskEvent {
  taskId: string;
  taskName: string;
}

export interface TaskStatusChangedEvent extends BaseTaskEvent {
  task: Task;
  previousStatus: TaskStatus;
  newStatus: TaskStatus;
}

// Union type for all event payloads
export type TaskEventPayload = 
  | TaskCreatedEvent
  | TaskUpdatedEvent  
  | TaskDeletedEvent
  | TaskStatusChangedEvent;

// Type-safe event emitter interface
export interface TaskEventEmitter {
  emit(event: typeof TASK_EVENTS.TASK_CREATED, payload: TaskCreatedEvent): boolean;
  emit(event: typeof TASK_EVENTS.TASK_UPDATED, payload: TaskUpdatedEvent): boolean;
  emit(event: typeof TASK_EVENTS.TASK_DELETED, payload: TaskDeletedEvent): boolean;
  emit(event: typeof TASK_EVENTS.TASK_STATUS_CHANGED, payload: TaskStatusChangedEvent): boolean;
  
  on(event: typeof TASK_EVENTS.TASK_CREATED, listener: (payload: TaskCreatedEvent) => void): this;
  on(event: typeof TASK_EVENTS.TASK_UPDATED, listener: (payload: TaskUpdatedEvent) => void): this;
  on(event: typeof TASK_EVENTS.TASK_DELETED, listener: (payload: TaskDeletedEvent) => void): this;
  on(event: typeof TASK_EVENTS.TASK_STATUS_CHANGED, listener: (payload: TaskStatusChangedEvent) => void): this;
  
  once(event: typeof TASK_EVENTS.TASK_CREATED, listener: (payload: TaskCreatedEvent) => void): this;
  once(event: typeof TASK_EVENTS.TASK_UPDATED, listener: (payload: TaskUpdatedEvent) => void): this;
  once(event: typeof TASK_EVENTS.TASK_DELETED, listener: (payload: TaskDeletedEvent) => void): this;
  once(event: typeof TASK_EVENTS.TASK_STATUS_CHANGED, listener: (payload: TaskStatusChangedEvent) => void): this;
  
  off(event: TaskEventName, listener: Function): this;
  removeAllListeners(event?: TaskEventName): this;
}

// Create singleton event emitter instance
class TypedEventEmitter extends EventEmitter implements TaskEventEmitter {}

export const taskEventEmitter: TaskEventEmitter = new TypedEventEmitter();

// Helper functions for creating event payloads
export function createTaskCreatedEvent(
  task: Task,
  projectId: string,
  planId: string = "default"
): TaskCreatedEvent {
  return {
    task,
    projectId,
    planId,
    timestamp: new Date(),
  };
}

export function createTaskUpdatedEvent(
  task: Task,
  changes: string[],
  projectId: string,
  planId: string = "default",
  previousData?: Partial<Task>
): TaskUpdatedEvent {
  return {
    task,
    changes,
    previousData,
    projectId,
    planId,
    timestamp: new Date(),
  };
}

export function createTaskDeletedEvent(
  taskId: string,
  taskName: string,
  projectId: string,
  planId: string = "default"
): TaskDeletedEvent {
  return {
    taskId,
    taskName,
    projectId,
    planId,
    timestamp: new Date(),
  };
}

export function createTaskStatusChangedEvent(
  task: Task,
  previousStatus: TaskStatus,
  newStatus: TaskStatus,
  projectId: string,
  planId: string = "default"
): TaskStatusChangedEvent {
  return {
    task,
    previousStatus,
    newStatus,
    projectId,
    planId,
    timestamp: new Date(),
  };
}

// Error handling for event emission with proper type safety
export function safeEmit(
  eventName: typeof TASK_EVENTS.TASK_CREATED,
  payload: TaskCreatedEvent,
  errorHandler?: (error: Error) => void
): boolean;
export function safeEmit(
  eventName: typeof TASK_EVENTS.TASK_UPDATED,
  payload: TaskUpdatedEvent,
  errorHandler?: (error: Error) => void
): boolean;
export function safeEmit(
  eventName: typeof TASK_EVENTS.TASK_DELETED,
  payload: TaskDeletedEvent,
  errorHandler?: (error: Error) => void
): boolean;
export function safeEmit(
  eventName: typeof TASK_EVENTS.TASK_STATUS_CHANGED,
  payload: TaskStatusChangedEvent,
  errorHandler?: (error: Error) => void
): boolean;
export function safeEmit(
  eventName: TaskEventName,
  payload: TaskEventPayload,
  errorHandler?: (error: Error) => void
): boolean {
  try {
    // Type assertion needed here due to overload complexity
    return (taskEventEmitter as any).emit(eventName, payload);
  } catch (error) {
    if (errorHandler) {
      errorHandler(error instanceof Error ? error : new Error(String(error)));
    } else {
      console.error(`Error emitting task event ${eventName}:`, error);
    }
    return false;
  }
}
