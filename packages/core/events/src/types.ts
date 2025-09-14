/**
 * Type definitions for the DICOM viewer event system
 */

import { z } from 'zod';

// Core DICOM types (these would typically come from @opendicom/core)
export interface DicomMetadata {
  studyInstanceUID: string;
  seriesInstanceUID: string;
  sopInstanceUID: string;
  patientName?: string;
  studyDate?: string;
  modality?: string;
  rows?: number;
  columns?: number;
  pixelSpacing?: [number, number];
  windowCenter?: number;
  windowWidth?: number;
  [key: string]: any;
}

export interface Camera {
  position: [number, number, number];
  focalPoint: [number, number, number];
  viewUp: [number, number, number];
  parallelScale?: number;
  zoom?: number;
}

export interface Annotation {
  id: string;
  type: string;
  data: any;
  metadata: {
    createdAt: Date;
    modifiedAt: Date;
    createdBy?: string;
  };
}

export type ViewportType = '2D' | '3D' | 'MPR' | 'Volume';
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
export type ToolState = 'active' | 'passive' | 'enabled' | 'disabled';

/**
 * Comprehensive event interface with strict typing
 */
export interface ViewerEvents {
  // Core system events
  'system:initialized': { timestamp: Date; version: string };
  'system:shutdown': { timestamp: Date; reason?: string };
  'system:error': { error: Error; context: string; timestamp: Date };
  
  // Image events
  'image:loading': { imageId: string; progress?: number };
  'image:loaded': { imageId: string; metadata: DicomMetadata; loadTime: number };
  'image:error': { imageId: string; error: Error; retryCount?: number };
  'image:cached': { imageId: string; cacheSize: number };
  'image:evicted': { imageId: string; reason: string };
  'image:prefetch-started': { imageIds: string[] };
  'image:prefetch-completed': { imageIds: string[]; successCount: number; errorCount: number };
  
  // Viewport events
  'viewport:created': { viewportId: string; type: ViewportType; element: HTMLElement };
  'viewport:destroyed': { viewportId: string; type: ViewportType };
  'viewport:resized': { viewportId: string; width: number; height: number };
  'viewport:camera-changed': { viewportId: string; camera: Camera; source: 'user' | 'programmatic' };
  'viewport:image-rendered': { viewportId: string; imageId: string; renderTime: number };
  'viewport:zoom-changed': { viewportId: string; zoom: number; center: [number, number] };
  'viewport:pan-changed': { viewportId: string; pan: [number, number] };
  'viewport:window-level-changed': { viewportId: string; windowCenter: number; windowWidth: number };
  'viewport:orientation-changed': { viewportId: string; orientation: string };
  
  // Tool events
  'tool:activated': { toolName: string; viewportId: string; toolState: ToolState };
  'tool:deactivated': { toolName: string; viewportId: string; previousState: ToolState };
  'tool:state-changed': { toolName: string; viewportId: string; oldState: ToolState; newState: ToolState };
  'tool:interaction-started': { toolName: string; viewportId: string; event: MouseEvent | TouchEvent };
  'tool:interaction-ended': { toolName: string; viewportId: string; duration: number };
  'tool:configuration-changed': { toolName: string; configuration: any; viewportId?: string };
  
  // Annotation events
  'annotation:created': { annotation: Annotation; viewportId: string; toolName: string };
  'annotation:modified': { annotation: Annotation; changes: Partial<Annotation>; viewportId: string };
  'annotation:deleted': { annotationId: string; viewportId: string; annotation: Annotation };
  'annotation:selected': { annotation: Annotation; viewportId: string; multiSelect: boolean };
  'annotation:deselected': { annotation: Annotation; viewportId: string };
  'annotation:visibility-changed': { annotationId: string; visible: boolean; viewportId: string };
  
  // Study/Series events
  'study:loaded': { studyInstanceUID: string; seriesCount: number; imageCount: number };
  'study:loading': { studyInstanceUID: string; progress: number };
  'study:error': { studyInstanceUID: string; error: Error };
  'series:loaded': { seriesInstanceUID: string; imageIds: string[]; metadata: DicomMetadata };
  'series:loading': { seriesInstanceUID: string; progress: number };
  'series:error': { seriesInstanceUID: string; error: Error };
  
  // Layout events
  'layout:changed': { layoutType: string; viewportCount: number; configuration: any };
  'layout:viewport-added': { viewportId: string; position: number };
  'layout:viewport-removed': { viewportId: string; position: number };
  'layout:viewport-swapped': { viewportId1: string; viewportId2: string };
  
  // Performance events
  'performance:fps-updated': { viewportId: string; fps: number; timestamp: Date };
  'performance:memory-usage': { heapUsed: number; heapTotal: number; timestamp: Date };
  'performance:render-time': { viewportId: string; renderTime: number; imageId: string };
  
  // User interaction events
  'user:mouse-click': { viewportId: string; position: [number, number]; button: number; modifiers: string[] };
  'user:mouse-move': { viewportId: string; position: [number, number]; delta: [number, number] };
  'user:mouse-wheel': { viewportId: string; delta: number; position: [number, number] };
  'user:keyboard': { key: string; modifiers: string[]; viewportId?: string };
  'user:touch': { viewportId: string; touches: TouchList; type: 'start' | 'move' | 'end' };
  
  // Configuration events
  'config:changed': { section: string; oldValue: any; newValue: any; source: 'user' | 'system' };
  'config:reset': { section?: string; timestamp: Date };
  'config:validated': { section: string; valid: boolean; errors?: string[] };
}

/**
 * Event handler function type
 */
export type EventHandler<K extends keyof ViewerEvents> = (
  data: ViewerEvents[K],
  context: EventContext
) => void | Promise<void>;

/**
 * Event context provided to handlers
 */
export interface EventContext {
  eventName: string;
  timestamp: Date;
  source: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

/**
 * Event subscription interface
 */
export interface EventSubscription {
  id: string;
  eventName: string;
  handler: EventHandler<any>;
  options: EventSubscriptionOptions;
  createdAt: Date;
  callCount: number;
  lastCalled?: Date;
}

/**
 * Options for event subscriptions
 */
export interface EventSubscriptionOptions {
  priority?: number;
  once?: boolean;
  namespace?: string;
  filter?: (data: any, context: EventContext) => boolean;
  debounce?: number;
  throttle?: number;
  async?: boolean;
}

/**
 * Event middleware function type
 */
export type EventMiddleware = (
  context: MiddlewareContext,
  next: () => Promise<void> | void
) => Promise<void> | void;

/**
 * Middleware context
 */
export interface MiddlewareContext {
  eventName: string;
  eventData: any;
  eventContext: EventContext;
  subscriptions: EventSubscription[];
  startTime: number;
  metadata: Record<string, any>;
}

/**
 * Event manager configuration options
 */
export interface EventManagerOptions {
  maxListeners?: number;
  enableLogging?: boolean;
  enableMetrics?: boolean;
  enableHistory?: boolean;
  historySize?: number;
  enableBatching?: boolean;
  batchSize?: number;
  batchTimeout?: number;
  enableValidation?: boolean;
  validationSchema?: Record<string, z.ZodSchema>;
}

/**
 * Event batch for performance optimization
 */
export interface EventBatch {
  id: string;
  events: Array<{
    name: string;
    data: any;
    context: EventContext;
  }>;
  createdAt: Date;
  processedAt?: Date;
}

/**
 * Event history entry
 */
export interface EventHistoryEntry {
  id: string;
  eventName: string;
  eventData: any;
  context: EventContext;
  timestamp: Date;
  processingTime: number;
  handlerCount: number;
  errors?: Error[];
}

/**
 * Event metrics
 */
export interface EventMetrics {
  totalEvents: number;
  eventCounts: Record<string, number>;
  averageProcessingTime: Record<string, number>;
  errorCounts: Record<string, number>;
  subscriptionCounts: Record<string, number>;
  lastReset: Date;
}

/**
 * Event validation schema
 */
export const EventValidationSchemas: Partial<Record<keyof ViewerEvents, z.ZodSchema>> = {
  'image:loaded': z.object({
    imageId: z.string(),
    metadata: z.object({
      studyInstanceUID: z.string(),
      seriesInstanceUID: z.string(),
      sopInstanceUID: z.string()
    }).passthrough(),
    loadTime: z.number().positive()
  }),
  
  'viewport:created': z.object({
    viewportId: z.string(),
    type: z.enum(['2D', '3D', 'MPR', 'Volume']),
    element: z.any() // HTMLElement
  }),
  
  'annotation:created': z.object({
    annotation: z.object({
      id: z.string(),
      type: z.string(),
      data: z.any(),
      metadata: z.object({
        createdAt: z.date(),
        modifiedAt: z.date(),
        createdBy: z.string().optional()
      })
    }),
    viewportId: z.string(),
    toolName: z.string()
  })
};

/**
 * Event namespace utility type
 */
export type EventNamespace<T extends string> = `${T}:${string}`;

/**
 * Utility type to extract event data type
 */
export type EventData<K extends keyof ViewerEvents> = ViewerEvents[K];

/**
 * Utility type for event name patterns
 */
export type EventPattern = keyof ViewerEvents | `${string}:*` | '*';