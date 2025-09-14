import { EventEmitter } from 'events';
import { DicomImage, DicomStudy, DicomSeries, ViewportState } from './types';

/**
 * Core DICOM viewer events
 */
export interface DicomViewerEvents {
  // Image events
  'image:loading': { imageId: string; progress?: number };
  'image:loaded': { image: DicomImage; imageId: string };
  'image:error': { imageId: string; error: Error };
  'image:cached': { imageId: string; size: number };
  'image:evicted': { imageId: string };
  
  // Study/Series events
  'study:loading': { studyInstanceUID: string };
  'study:loaded': { study: DicomStudy };
  'study:error': { studyInstanceUID: string; error: Error };
  'series:loading': { seriesInstanceUID: string };
  'series:loaded': { series: DicomSeries };
  'series:error': { seriesInstanceUID: string; error: Error };
  
  // Viewport events
  'viewport:created': { viewportId: string; element: HTMLElement };
  'viewport:destroyed': { viewportId: string };
  'viewport:resized': { viewportId: string; width: number; height: number };
  'viewport:rendered': { viewportId: string; renderTime: number };
  'viewport:state-changed': { viewportId: string; state: ViewportState };
  
  // Tool events
  'tool:activated': { toolName: string; viewportId?: string };
  'tool:deactivated': { toolName: string; viewportId?: string };
  'tool:measurement-added': { toolName: string; measurement: any; viewportId: string };
  'tool:measurement-modified': { toolName: string; measurement: any; viewportId: string };
  'tool:measurement-removed': { toolName: string; measurementId: string; viewportId: string };
  
  // Annotation events
  'annotation:created': { annotation: any; viewportId: string };
  'annotation:updated': { annotation: any; viewportId: string };
  'annotation:deleted': { annotationId: string; viewportId: string };
  'annotation:selected': { annotation: any; viewportId: string };
  
  // Window/Level events
  'window-level:changed': { 
    viewportId: string; 
    windowWidth: number; 
    windowCenter: number; 
    preset?: string;
  };
  
  // Zoom/Pan events
  'zoom:changed': { viewportId: string; scale: number; center: { x: number; y: number } };
  'pan:changed': { viewportId: string; translation: { x: number; y: number } };
  'rotation:changed': { viewportId: string; rotation: number };
  'flip:changed': { viewportId: string; flipHorizontal: boolean; flipVertical: boolean };
  
  // Layout events
  'layout:changed': { 
    rows: number; 
    columns: number; 
    viewports: string[];
  };
  'layout:viewport-activated': { viewportId: string };
  
  // Configuration events
  'config:changed': { key: string; value: any; previousValue: any };
  'config:reset': { section?: string };
  
  // Error events
  'error:critical': { error: Error; context?: string };
  'error:recoverable': { error: Error; context?: string };
  'error:network': { error: Error; url?: string; method?: string };
  
  // Performance events
  'performance:render-start': { viewportId: string; timestamp: number };
  'performance:render-end': { viewportId: string; timestamp: number; duration: number };
  'performance:memory-warning': { usage: number; limit: number };
  
  // User interaction events
  'interaction:mouse-down': { viewportId: string; event: MouseEvent; imageCoords: { x: number; y: number } };
  'interaction:mouse-up': { viewportId: string; event: MouseEvent; imageCoords: { x: number; y: number } };
  'interaction:mouse-move': { viewportId: string; event: MouseEvent; imageCoords: { x: number; y: number } };
  'interaction:wheel': { viewportId: string; event: WheelEvent; delta: number };
  'interaction:touch-start': { viewportId: string; event: TouchEvent };
  'interaction:touch-move': { viewportId: string; event: TouchEvent };
  'interaction:touch-end': { viewportId: string; event: TouchEvent };
  'interaction:key-down': { viewportId: string; event: KeyboardEvent };
  'interaction:key-up': { viewportId: string; event: KeyboardEvent };
  
  // Plugin events
  'plugin:loaded': { pluginName: string; version: string };
  'plugin:unloaded': { pluginName: string };
  'plugin:error': { pluginName: string; error: Error };
}

/**
 * Event priority levels
 */
export enum EventPriority {
  LOWEST = 0,
  LOW = 25,
  NORMAL = 50,
  HIGH = 75,
  HIGHEST = 100,
  CRITICAL = 1000
}

/**
 * Event listener options
 */
export interface EventListenerOptions {
  priority?: EventPriority;
  once?: boolean;
  prepend?: boolean;
}

/**
 * Event listener with metadata
 */
interface EventListener {
  listener: (...args: any[]) => void;
  priority: EventPriority;
  once: boolean;
}

/**
 * Enhanced event hub with TypeScript support and priority handling
 */
export class EventHub extends EventEmitter {
  private listenerMap = new Map<string, EventListener[]>();
  private eventHistory = new Map<string, any[]>();
  private maxHistorySize = 100;
  
  constructor() {
    super();
    this.setMaxListeners(0); // Remove limit
  }
  
  /**
   * Add a typed event listener with priority support
   */
  on<K extends keyof DicomViewerEvents>(
    event: K,
    listener: (data: DicomViewerEvents[K]) => void,
    options: EventListenerOptions = {}
  ): this {
    const {
      priority = EventPriority.NORMAL,
      once = false,
      prepend = false
    } = options;
    
    const eventListener: EventListener = {
      listener,
      priority,
      once
    };
    
    // Get or create listener array
    let listeners = this.listenerMap.get(event);
    if (!listeners) {
      listeners = [];
      this.listenerMap.set(event, listeners);
    }
    
    // Insert listener based on priority
    if (prepend) {
      listeners.unshift(eventListener);
    } else {
      // Find insertion point based on priority
      let insertIndex = listeners.length;
      for (let i = 0; i < listeners.length; i++) {
        if (listeners[i].priority < priority) {
          insertIndex = i;
          break;
        }
      }
      listeners.splice(insertIndex, 0, eventListener);
    }
    
    // Register with EventEmitter
    if (once) {
      super.once(event, listener);
    } else {
      super.on(event, listener);
    }
    
    return this;
  }
  
  /**
   * Add a one-time event listener
   */
  once<K extends keyof DicomViewerEvents>(
    event: K,
    listener: (data: DicomViewerEvents[K]) => void,
    options: Omit<EventListenerOptions, 'once'> = {}
  ): this {
    return this.on(event, listener, { ...options, once: true });
  }
  
  /**
   * Remove event listener
   */
  off<K extends keyof DicomViewerEvents>(
    event: K,
    listener: (data: DicomViewerEvents[K]) => void
  ): this {
    // Remove from priority map
    const listeners = this.listenerMap.get(event);
    if (listeners) {
      const index = listeners.findIndex(l => l.listener === listener);
      if (index !== -1) {
        listeners.splice(index, 1);
        if (listeners.length === 0) {
          this.listenerMap.delete(event);
        }
      }
    }
    
    // Remove from EventEmitter
    super.off(event, listener);
    return this;
  }
  
  /**
   * Emit a typed event
   */
  emit<K extends keyof DicomViewerEvents>(
    event: K,
    data: DicomViewerEvents[K]
  ): boolean {
    // Store in history
    this.addToHistory(event, data);
    
    // Emit event
    return super.emit(event, data);
  }
  
  /**
   * Emit event asynchronously
   */
  async emitAsync<K extends keyof DicomViewerEvents>(
    event: K,
    data: DicomViewerEvents[K]
  ): Promise<void> {
    const listeners = this.listenerMap.get(event) || [];
    
    // Store in history
    this.addToHistory(event, data);
    
    // Execute listeners in priority order
    for (const { listener, once } of listeners) {
      try {
        await Promise.resolve(listener(data));
        
        // Remove one-time listeners
        if (once) {
          this.off(event, listener);
        }
      } catch (error) {
        console.error(`Error in event listener for '${event}':`, error);
        this.emit('error:critical', { 
          error: error as Error, 
          context: `Event listener for '${event}'` 
        });
      }
    }
  }
  
  /**
   * Get event history
   */
  getEventHistory<K extends keyof DicomViewerEvents>(
    event?: K,
    limit?: number
  ): Array<{ event: string; data: any; timestamp: number }> {
    if (event) {
      const history = this.eventHistory.get(event) || [];
      return limit ? history.slice(-limit) : history;
    }
    
    // Return all events
    const allEvents: Array<{ event: string; data: any; timestamp: number }> = [];
    for (const [eventName, history] of this.eventHistory) {
      allEvents.push(...history.map(item => ({ event: eventName, ...item })));
    }
    
    // Sort by timestamp
    allEvents.sort((a, b) => a.timestamp - b.timestamp);
    
    return limit ? allEvents.slice(-limit) : allEvents;
  }
  
  /**
   * Clear event history
   */
  clearHistory(event?: keyof DicomViewerEvents): void {
    if (event) {
      this.eventHistory.delete(event);
    } else {
      this.eventHistory.clear();
    }
  }
  
  /**
   * Get listener count for an event
   */
  getListenerCount(event: keyof DicomViewerEvents): number {
    const listeners = this.listenerMap.get(event);
    return listeners ? listeners.length : 0;
  }
  
  /**
   * Get all registered events
   */
  getRegisteredEvents(): string[] {
    return Array.from(this.listenerMap.keys());
  }
  
  /**
   * Remove all listeners for an event or all events
   */
  removeAllListeners(event?: keyof DicomViewerEvents): this {
    if (event) {
      this.listenerMap.delete(event);
    } else {
      this.listenerMap.clear();
    }
    
    return super.removeAllListeners(event);
  }
  
  private addToHistory(event: string, data: any): void {
    let history = this.eventHistory.get(event);
    if (!history) {
      history = [];
      this.eventHistory.set(event, history);
    }
    
    history.push({
      data,
      timestamp: Date.now()
    });
    
    // Limit history size
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }
}

/**
 * Global event hub instance
 */
export const eventHub = new EventHub();

/**
 * Event utilities
 */
export class EventUtils {
  /**
   * Create a debounced event emitter
   */
  static debounce<K extends keyof DicomViewerEvents>(
    hub: EventHub,
    event: K,
    delay: number
  ): (data: DicomViewerEvents[K]) => void {
    let timeoutId: NodeJS.Timeout;
    
    return (data: DicomViewerEvents[K]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        hub.emit(event, data);
      }, delay);
    };
  }
  
  /**
   * Create a throttled event emitter
   */
  static throttle<K extends keyof DicomViewerEvents>(
    hub: EventHub,
    event: K,
    delay: number
  ): (data: DicomViewerEvents[K]) => void {
    let lastEmit = 0;
    
    return (data: DicomViewerEvents[K]) => {
      const now = Date.now();
      if (now - lastEmit >= delay) {
        hub.emit(event, data);
        lastEmit = now;
      }
    };
  }
  
  /**
   * Wait for a specific event
   */
  static waitForEvent<K extends keyof DicomViewerEvents>(
    hub: EventHub,
    event: K,
    timeout?: number
  ): Promise<DicomViewerEvents[K]> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout;
      
      const listener = (data: DicomViewerEvents[K]) => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve(data);
      };
      
      hub.once(event, listener);
      
      if (timeout) {
        timeoutId = setTimeout(() => {
          hub.off(event, listener);
          reject(new Error(`Timeout waiting for event '${event}'`));
        }, timeout);
      }
    });
  }
}