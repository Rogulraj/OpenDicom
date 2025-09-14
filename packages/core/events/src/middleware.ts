/**
 * Event middleware implementations for logging, validation, and performance monitoring
 */

import { EventMiddleware, MiddlewareContext, EventValidationSchemas } from './types';

/**
 * Logging middleware that logs all events with configurable detail levels
 */
export const loggingMiddleware = (options: {
  level?: 'debug' | 'info' | 'warn' | 'error';
  includeData?: boolean;
  includeContext?: boolean;
  filter?: (eventName: string) => boolean;
} = {}): EventMiddleware => {
  const { level = 'info', includeData = true, includeContext = false, filter } = options;

  return async (context: MiddlewareContext, next) => {
    const { eventName, eventData, eventContext, subscriptions } = context;

    // Apply filter if provided
    if (filter && !filter(eventName)) {
      await next();
      return;
    }

    const logData: any = {
      event: eventName,
      timestamp: eventContext.timestamp,
      subscriptions: subscriptions.length,
      correlationId: eventContext.correlationId
    };

    if (includeData) {
      logData.data = eventData;
    }

    if (includeContext) {
      logData.context = eventContext;
    }

    // Log before processing
    console[level](`[EventManager] Processing ${eventName}`, logData);

    const startTime = Date.now();
    try {
      await next();
      
      // Log success
      const duration = Date.now() - startTime;
      console[level](`[EventManager] Completed ${eventName} in ${duration}ms`);
    } catch (error) {
      // Log error
      const duration = Date.now() - startTime;
      console.error(`[EventManager] Failed ${eventName} after ${duration}ms:`, error);
      throw error;
    }
  };
};

/**
 * Validation middleware that validates event data against schemas
 */
export const validationMiddleware = (options: {
  strictMode?: boolean;
  customSchemas?: Record<string, any>;
  onValidationError?: (eventName: string, error: Error, data: any) => void;
} = {}): EventMiddleware => {
  const { strictMode = false, customSchemas = {}, onValidationError } = options;

  return async (context: MiddlewareContext, next) => {
    const { eventName, eventData } = context;

    // Get validation schema
    const schema = customSchemas[eventName] || 
                  EventValidationSchemas[eventName as keyof typeof EventValidationSchemas];

    if (schema) {
      try {
        const result = schema.safeParse(eventData);
        if (!result.success) {
          const error = new Error(
            `Event validation failed for ${eventName}: ${result.error.message}`
          );
          
          if (onValidationError) {
            onValidationError(eventName, error, eventData);
          }

          if (strictMode) {
            throw error;
          } else {
            console.warn(`[EventManager] Validation warning for ${eventName}:`, error.message);
          }
        } else {
          // Store validated data
          context.metadata.validatedData = result.data;
        }
      } catch (error) {
        if (onValidationError) {
          onValidationError(eventName, error as Error, eventData);
        }
        
        if (strictMode) {
          throw error;
        }
      }
    }

    await next();
  };
};

/**
 * Performance monitoring middleware that tracks execution times and resource usage
 */
export const performanceMiddleware = (options: {
  enableMemoryTracking?: boolean;
  enableDetailedTiming?: boolean;
  slowEventThreshold?: number;
  onSlowEvent?: (eventName: string, duration: number, context: MiddlewareContext) => void;
  onMemoryWarning?: (usage: NodeJS.MemoryUsage, eventName: string) => void;
} = {}): EventMiddleware => {
  const {
    enableMemoryTracking = false,
    enableDetailedTiming = true,
    slowEventThreshold = 100,
    onSlowEvent,
    onMemoryWarning
  } = options;

  return async (context: MiddlewareContext, next) => {
    const { eventName } = context;
    const startTime = process.hrtime.bigint();
    let memoryBefore: NodeJS.MemoryUsage | undefined;

    if (enableMemoryTracking) {
      memoryBefore = process.memoryUsage();
    }

    try {
      await next();
    } finally {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

      // Store performance data
      context.metadata.performance = {
        duration,
        startTime: Number(startTime),
        endTime: Number(endTime)
      };

      if (enableDetailedTiming) {
        context.metadata.performance.detailed = {
          subscriptionCount: context.subscriptions.length,
          processingTime: duration
        };
      }

      // Check for slow events
      if (duration > slowEventThreshold) {
        if (onSlowEvent) {
          onSlowEvent(eventName, duration, context);
        } else {
          console.warn(
            `[EventManager] Slow event detected: ${eventName} took ${duration.toFixed(2)}ms`
          );
        }
      }

      // Memory tracking
      if (enableMemoryTracking && memoryBefore) {
        const memoryAfter = process.memoryUsage();
        const memoryDelta = {
          heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
          heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
          external: memoryAfter.external - memoryBefore.external,
          rss: memoryAfter.rss - memoryBefore.rss
        };

        context.metadata.performance.memory = {
          before: memoryBefore,
          after: memoryAfter,
          delta: memoryDelta
        };

        // Check for memory warnings
        if (memoryAfter.heapUsed > 100 * 1024 * 1024) { // 100MB threshold
          if (onMemoryWarning) {
            onMemoryWarning(memoryAfter, eventName);
          } else {
            console.warn(
              `[EventManager] High memory usage detected after ${eventName}: ${Math.round(memoryAfter.heapUsed / 1024 / 1024)}MB`
            );
          }
        }
      }
    }
  };
};

/**
 * Rate limiting middleware that prevents event spam
 */
export const rateLimitingMiddleware = (options: {
  maxEventsPerSecond?: number;
  maxEventsPerMinute?: number;
  perEventLimits?: Record<string, { perSecond?: number; perMinute?: number }>;
  onRateLimit?: (eventName: string, limit: string) => void;
} = {}): EventMiddleware => {
  const {
    maxEventsPerSecond = 100,
    maxEventsPerMinute = 1000,
    perEventLimits = {},
    onRateLimit
  } = options;

  const eventCounts = new Map<string, { second: number[]; minute: number[] }>();

  const cleanupOldCounts = (counts: number[], maxAge: number) => {
    const now = Date.now();
    return counts.filter(timestamp => now - timestamp < maxAge);
  };

  return async (context: MiddlewareContext, next) => {
    const { eventName } = context;
    const now = Date.now();

    // Get or create event counts
    if (!eventCounts.has(eventName)) {
      eventCounts.set(eventName, { second: [], minute: [] });
    }
    const counts = eventCounts.get(eventName)!;

    // Clean up old counts
    counts.second = cleanupOldCounts(counts.second, 1000); // 1 second
    counts.minute = cleanupOldCounts(counts.minute, 60000); // 1 minute

    // Get limits for this event
    const eventLimits = perEventLimits[eventName] || {};
    const secondLimit = eventLimits.perSecond ?? maxEventsPerSecond;
    const minuteLimit = eventLimits.perMinute ?? maxEventsPerMinute;

    // Check rate limits
    if (counts.second.length >= secondLimit) {
      const error = new Error(`Rate limit exceeded for ${eventName}: ${secondLimit} events per second`);
      if (onRateLimit) {
        onRateLimit(eventName, 'per-second');
      }
      throw error;
    }

    if (counts.minute.length >= minuteLimit) {
      const error = new Error(`Rate limit exceeded for ${eventName}: ${minuteLimit} events per minute`);
      if (onRateLimit) {
        onRateLimit(eventName, 'per-minute');
      }
      throw error;
    }

    // Record this event
    counts.second.push(now);
    counts.minute.push(now);

    await next();
  };
};

/**
 * Circuit breaker middleware that prevents cascading failures
 */
export const circuitBreakerMiddleware = (options: {
  failureThreshold?: number;
  resetTimeout?: number;
  monitoringPeriod?: number;
  onCircuitOpen?: (eventName: string) => void;
  onCircuitClose?: (eventName: string) => void;
} = {}): EventMiddleware => {
  const {
    failureThreshold = 5,
    resetTimeout = 60000, // 1 minute
    monitoringPeriod = 60000, // 1 minute
    onCircuitOpen,
    onCircuitClose
  } = options;

  const circuitStates = new Map<string, {
    state: 'closed' | 'open' | 'half-open';
    failures: number[];
    lastFailure?: number;
    nextAttempt?: number;
  }>();

  return async (context: MiddlewareContext, next) => {
    const { eventName } = context;
    const now = Date.now();

    // Get or create circuit state
    if (!circuitStates.has(eventName)) {
      circuitStates.set(eventName, {
        state: 'closed',
        failures: []
      });
    }
    const circuit = circuitStates.get(eventName)!;

    // Clean up old failures
    circuit.failures = circuit.failures.filter(
      timestamp => now - timestamp < monitoringPeriod
    );

    // Check circuit state
    if (circuit.state === 'open') {
      if (circuit.nextAttempt && now < circuit.nextAttempt) {
        throw new Error(`Circuit breaker is open for ${eventName}. Next attempt in ${Math.round((circuit.nextAttempt - now) / 1000)}s`);
      } else {
        // Try to close the circuit
        circuit.state = 'half-open';
      }
    }

    try {
      await next();
      
      // Success - close circuit if it was half-open
      if (circuit.state === 'half-open') {
        circuit.state = 'closed';
        circuit.failures = [];
        if (onCircuitClose) {
          onCircuitClose(eventName);
        }
      }
    } catch (error) {
      // Failure - record it
      circuit.failures.push(now);
      circuit.lastFailure = now;

      // Check if we should open the circuit
      if (circuit.failures.length >= failureThreshold && circuit.state !== 'open') {
        circuit.state = 'open';
        circuit.nextAttempt = now + resetTimeout;
        if (onCircuitOpen) {
          onCircuitOpen(eventName);
        }
      }

      throw error;
    }
  };
};

/**
 * Async event handling middleware that manages async event processing
 */
export const asyncMiddleware = (options: {
  maxConcurrentEvents?: number;
  queueSize?: number;
  timeout?: number;
  onQueueFull?: (eventName: string) => void;
  onTimeout?: (eventName: string, duration: number) => void;
} = {}): EventMiddleware => {
  const {
    maxConcurrentEvents = 10,
    queueSize = 100,
    timeout = 30000, // 30 seconds
    onQueueFull,
    onTimeout
  } = options;

  const activeEvents = new Set<string>();
  const eventQueue: Array<{ context: MiddlewareContext; next: () => Promise<void> }> = [];

  const processQueue = async () => {
    while (eventQueue.length > 0 && activeEvents.size < maxConcurrentEvents) {
      const { context, next } = eventQueue.shift()!;
      const eventId = `${context.eventName}_${Date.now()}_${Math.random()}`;
      
      activeEvents.add(eventId);
      
      // Process with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Event ${context.eventName} timed out after ${timeout}ms`));
        }, timeout);
      });

      try {
        await Promise.race([next(), timeoutPromise]);
      } catch (error) {
        if (error instanceof Error && error.message.includes('timed out')) {
          if (onTimeout) {
            onTimeout(context.eventName, timeout);
          }
        }
        throw error;
      } finally {
        activeEvents.delete(eventId);
        // Process next item in queue
        setImmediate(processQueue);
      }
    }
  };

  return async (context: MiddlewareContext, next) => {
    // Check if we can process immediately
    if (activeEvents.size < maxConcurrentEvents) {
      await processQueue();
      return;
    }

    // Add to queue
    if (eventQueue.length >= queueSize) {
      if (onQueueFull) {
        onQueueFull(context.eventName);
      }
      throw new Error(`Event queue is full (${queueSize} events). Cannot process ${context.eventName}`);
    }

    eventQueue.push({ context, next });
    await processQueue();
  };
};

/**
 * Export all middleware as a collection
 */
export const middleware = {
  logging: loggingMiddleware,
  validation: validationMiddleware,
  performance: performanceMiddleware,
  rateLimit: rateLimitingMiddleware,
  circuitBreaker: circuitBreakerMiddleware,
  async: asyncMiddleware
};