/**
 * Advanced Event Manager for DICOM viewer with middleware pipeline,
 * subscription management, and performance optimization
 */

import { EventEmitter } from 'eventemitter3';
import {
  ViewerEvents,
  EventHandler,
  EventContext,
  EventSubscription,
  EventSubscriptionOptions,
  EventMiddleware,
  MiddlewareContext,
  EventManagerOptions,
  EventBatch,
  EventHistoryEntry,
  EventMetrics,
  EventValidationSchemas,
  EventPattern,
  EventData
} from './types';

/**
 * Advanced event manager with middleware support and performance optimization
 */
export class EventManager {
  private emitter: EventEmitter;
  private subscriptions = new Map<string, EventSubscription>();
  private middleware: EventMiddleware[] = [];
  private options: Required<EventManagerOptions>;
  private history: EventHistoryEntry[] = [];
  private metrics: EventMetrics;
  private batches = new Map<string, EventBatch>();
  private batchTimer?: NodeJS.Timeout;
  private subscriptionCounter = 0;
  private correlationCounter = 0;

  constructor(options: EventManagerOptions = {}) {
    this.emitter = new EventEmitter();
    this.options = {
      maxListeners: options.maxListeners ?? 100,
      enableLogging: options.enableLogging ?? false,
      enableMetrics: options.enableMetrics ?? true,
      enableHistory: options.enableHistory ?? true,
      historySize: options.historySize ?? 1000,
      enableBatching: options.enableBatching ?? false,
      batchSize: options.batchSize ?? 10,
      batchTimeout: options.batchTimeout ?? 100,
      enableValidation: options.enableValidation ?? true,
      validationSchema: options.validationSchema ?? {}
    };

    this.metrics = {
      totalEvents: 0,
      eventCounts: {},
      averageProcessingTime: {},
      errorCounts: {},
      subscriptionCounts: {},
      lastReset: new Date()
    };

    this.emitter.setMaxListeners(this.options.maxListeners);
    this.setupDefaultMiddleware();
  }

  /**
   * Subscribe to an event with advanced options
   */
  on<K extends keyof ViewerEvents>(
    eventName: K,
    handler: EventHandler<K>,
    options: EventSubscriptionOptions = {}
  ): EventSubscription {
    const subscriptionId = `sub_${++this.subscriptionCounter}`;
    const subscription: EventSubscription = {
      id: subscriptionId,
      eventName: eventName as string,
      handler: handler as EventHandler<any>,
      options,
      createdAt: new Date(),
      callCount: 0,
      lastCalled: undefined
    };

    // Apply debouncing/throttling if specified
    let wrappedHandler = handler as EventHandler<any>;
    if (options.debounce) {
      wrappedHandler = this.debounce(handler as EventHandler<any>, options.debounce);
    } else if (options.throttle) {
      wrappedHandler = this.throttle(handler as EventHandler<any>, options.throttle);
    }

    // Create the actual event listener
    const eventListener = async (data: ViewerEvents[K], context: EventContext) => {
      // Apply filter if specified
      if (options.filter && !options.filter(data, context)) {
        return;
      }

      subscription.callCount++;
      subscription.lastCalled = new Date();

      try {
        if (options.async) {
          // Non-blocking execution
          setImmediate(() => wrappedHandler(data, context));
        } else {
          await wrappedHandler(data, context);
        }
      } catch (error) {
        this.handleError(error as Error, eventName as string, context);
      }

      // Remove subscription if it's a one-time listener
      if (options.once) {
        this.off(subscriptionId);
      }
    };

    // Store subscription
    this.subscriptions.set(subscriptionId, subscription);

    // Add to EventEmitter with priority handling
    if (options.priority !== undefined) {
      // Higher priority listeners are added first
      const existingListeners = this.emitter.listeners(eventName as string);
      this.emitter.removeAllListeners(eventName as string);
      
      const sortedListeners = [...existingListeners, eventListener]
        .sort((a, b) => {
          const aPriority = (a as any).__priority ?? 0;
          const bPriority = (b as any).__priority ?? 0;
          return bPriority - aPriority;
        });

      (eventListener as any).__priority = options.priority;
      sortedListeners.forEach(listener => {
        this.emitter.on(eventName as string, listener);
      });
    } else {
      this.emitter.on(eventName as string, eventListener);
    }

    // Update metrics
    this.updateSubscriptionMetrics(eventName as string, 1);

    return subscription;
  }

  /**
   * Unsubscribe from an event
   */
  off(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    this.emitter.removeAllListeners(subscription.eventName);
    this.subscriptions.delete(subscriptionId);
    this.updateSubscriptionMetrics(subscription.eventName, -1);

    return true;
  }

  /**
   * Emit an event with middleware pipeline
   */
  async emit<K extends keyof ViewerEvents>(
    eventName: K,
    data: ViewerEvents[K],
    options: { correlationId?: string; source?: string; metadata?: Record<string, any> } = {}
  ): Promise<void> {
    const startTime = Date.now();
    const context: EventContext = {
      eventName: eventName as string,
      timestamp: new Date(),
      source: options.source ?? 'unknown',
      correlationId: options.correlationId ?? `corr_${++this.correlationCounter}`,
      metadata: options.metadata
    };

    // Validate event data if validation is enabled
    if (this.options.enableValidation) {
      this.validateEventData(eventName as string, data);
    }

    // Get relevant subscriptions
    const subscriptions = Array.from(this.subscriptions.values())
      .filter(sub => this.matchesPattern(sub.eventName, eventName as string));

    const middlewareContext: MiddlewareContext = {
      eventName: eventName as string,
      eventData: data,
      eventContext: context,
      subscriptions,
      startTime,
      metadata: {}
    };

    try {
      // Execute middleware pipeline
      await this.executeMiddleware(middlewareContext, async () => {
        // Emit to EventEmitter
        this.emitter.emit(eventName as string, data, context);
      });

      // Update metrics
      this.updateEventMetrics(eventName as string, Date.now() - startTime);

      // Add to history
      if (this.options.enableHistory) {
        this.addToHistory({
          id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          eventName: eventName as string,
          eventData: data,
          context,
          timestamp: context.timestamp,
          processingTime: Date.now() - startTime,
          handlerCount: subscriptions.length,
          errors: []
        });
      }

    } catch (error) {
      this.handleError(error as Error, eventName as string, context);
      throw error;
    }
  }

  /**
   * Add middleware to the pipeline
   */
  use(middleware: EventMiddleware): void {
    this.middleware.push(middleware);
  }

  /**
   * Remove middleware from the pipeline
   */
  removeMiddleware(middleware: EventMiddleware): boolean {
    const index = this.middleware.indexOf(middleware);
    if (index !== -1) {
      this.middleware.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get subscription by ID
   */
  getSubscription(subscriptionId: string): EventSubscription | undefined {
    return this.subscriptions.get(subscriptionId);
  }

  /**
   * Get all subscriptions for an event pattern
   */
  getSubscriptions(pattern: EventPattern): EventSubscription[] {
    return Array.from(this.subscriptions.values())
      .filter(sub => this.matchesPattern(sub.eventName, pattern));
  }

  /**
   * Get event metrics
   */
  getMetrics(): EventMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalEvents: 0,
      eventCounts: {},
      averageProcessingTime: {},
      errorCounts: {},
      subscriptionCounts: { ...this.metrics.subscriptionCounts },
      lastReset: new Date()
    };
  }

  /**
   * Get event history
   */
  getHistory(eventName?: string, limit?: number): EventHistoryEntry[] {
    let history = this.history;
    
    if (eventName) {
      history = history.filter(entry => entry.eventName === eventName);
    }
    
    if (limit) {
      history = history.slice(-limit);
    }
    
    return [...history];
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Destroy the event manager
   */
  destroy(): void {
    this.emitter.removeAllListeners();
    this.subscriptions.clear();
    this.middleware = [];
    this.history = [];
    this.batches.clear();
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
  }

  /**
   * Setup default middleware
   */
  private setupDefaultMiddleware(): void {
    // Logging middleware
    if (this.options.enableLogging) {
      this.use(async (context, next) => {
        console.log(`[EventManager] Emitting ${context.eventName}`, {
          data: context.eventData,
          subscriptions: context.subscriptions.length,
          timestamp: context.eventContext.timestamp
        });
        await next();
      });
    }

    // Performance monitoring middleware
    if (this.options.enableMetrics) {
      this.use(async (context, next) => {
        const start = Date.now();
        await next();
        const duration = Date.now() - start;
        context.metadata.processingTime = duration;
      });
    }
  }

  /**
   * Execute middleware pipeline
   */
  private async executeMiddleware(
    context: MiddlewareContext,
    finalHandler: () => Promise<void> | void
  ): Promise<void> {
    let index = 0;

    const next = async (): Promise<void> => {
      if (index >= this.middleware.length) {
        await finalHandler();
        return;
      }

      const middleware = this.middleware[index++];
      await middleware(context, next);
    };

    await next();
  }

  /**
   * Validate event data against schema
   */
  private validateEventData(eventName: string, data: any): void {
    const schema = EventValidationSchemas[eventName as keyof ViewerEvents] || 
                  this.options.validationSchema[eventName];
    
    if (schema) {
      const result = schema.safeParse(data);
      if (!result.success) {
        throw new Error(`Event validation failed for ${eventName}: ${result.error.message}`);
      }
    }
  }

  /**
   * Check if event name matches pattern
   */
  private matchesPattern(eventName: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern === eventName) return true;
    if (pattern.endsWith(':*')) {
      const namespace = pattern.slice(0, -2);
      return eventName.startsWith(namespace + ':');
    }
    return false;
  }

  /**
   * Update event metrics
   */
  private updateEventMetrics(eventName: string, processingTime: number): void {
    this.metrics.totalEvents++;
    this.metrics.eventCounts[eventName] = (this.metrics.eventCounts[eventName] || 0) + 1;
    
    const currentAvg = this.metrics.averageProcessingTime[eventName] || 0;
    const count = this.metrics.eventCounts[eventName];
    this.metrics.averageProcessingTime[eventName] = 
      (currentAvg * (count - 1) + processingTime) / count;
  }

  /**
   * Update subscription metrics
   */
  private updateSubscriptionMetrics(eventName: string, delta: number): void {
    this.metrics.subscriptionCounts[eventName] = 
      (this.metrics.subscriptionCounts[eventName] || 0) + delta;
  }

  /**
   * Add entry to history
   */
  private addToHistory(entry: EventHistoryEntry): void {
    this.history.push(entry);
    
    // Maintain history size limit
    if (this.history.length > this.options.historySize) {
      this.history.shift();
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: Error, eventName: string, context: EventContext): void {
    this.metrics.errorCounts[eventName] = (this.metrics.errorCounts[eventName] || 0) + 1;
    
    if (this.options.enableLogging) {
      console.error(`[EventManager] Error in ${eventName}:`, error, { context });
    }

    // Emit error event
    this.emitter.emit('system:error', {
      error,
      context: `Event: ${eventName}`,
      timestamp: new Date()
    });
  }

  /**
   * Debounce function
   */
  private debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): T {
    let timeoutId: NodeJS.Timeout;
    return ((...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    }) as T;
  }

  /**
   * Throttle function
   */
  private throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): T {
    let lastCall = 0;
    return ((...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        return func(...args);
      }
    }) as T;
  }
}

/**
 * Global event manager instance
 */
export const eventManager = new EventManager({
  enableLogging: process.env.NODE_ENV === 'development',
  enableMetrics: true,
  enableHistory: true,
  historySize: 1000,
  maxListeners: 100
});