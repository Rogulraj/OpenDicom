/**
 * Logging and error handling utilities
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  args: any[];
  context?: string;
  error?: Error;
  metadata?: Record<string, any>;
}

export interface LogTransport {
  name: string;
  level: LogLevel;
  log(entry: LogEntry): void | Promise<void>;
}

/**
 * Console transport for logging
 */
export class ConsoleTransport implements LogTransport {
  name = 'console';
  level: LogLevel;
  
  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }
  
  log(entry: LogEntry): void {
    if (entry.level < this.level) return;
    
    const timestamp = new Date(entry.timestamp).toISOString();
    const levelName = LogLevel[entry.level];
    const prefix = `[${timestamp}] [${levelName}]`;
    
    const message = entry.context 
      ? `${prefix} [${entry.context}] ${entry.message}`
      : `${prefix} ${entry.message}`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, ...entry.args);
        break;
      case LogLevel.INFO:
        console.info(message, ...entry.args);
        break;
      case LogLevel.WARN:
        console.warn(message, ...entry.args);
        break;
      case LogLevel.ERROR:
        console.error(message, ...entry.args);
        if (entry.error) {
          console.error(entry.error);
        }
        break;
    }
  }
}

/**
 * Remote transport for logging
 */
export class RemoteTransport implements LogTransport {
  name = 'remote';
  level: LogLevel;
  private endpoint: string;
  private apiKey?: string;
  private buffer: LogEntry[] = [];
  private batchSize = 10;
  private flushInterval = 5000;
  private flushTimer?: NodeJS.Timeout;
  
  constructor(endpoint: string, level: LogLevel = LogLevel.WARN, apiKey?: string) {
    this.endpoint = endpoint;
    this.level = level;
    this.apiKey = apiKey;
    
    // Start flush timer
    this.flushTimer = setInterval(() => this.flush(), this.flushInterval);
  }
  
  async log(entry: LogEntry): Promise<void> {
    if (entry.level < this.level) return;
    
    this.buffer.push(entry);
    
    if (this.buffer.length >= this.batchSize) {
      await this.flush();
    }
  }
  
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    const entries = [...this.buffer];
    this.buffer = [];
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }
      
      await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ entries })
      });
    } catch (error) {
      // Fallback to console if remote logging fails
      console.error('Failed to send logs to remote endpoint:', error);
      entries.forEach(entry => {
        console.error(`[REMOTE LOG] ${entry.message}`, ...entry.args);
      });
    }
  }
  
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush(); // Final flush
  }
}

/**
 * Memory transport for testing and debugging
 */
export class MemoryTransport implements LogTransport {
  name = 'memory';
  level: LogLevel;
  private entries: LogEntry[] = [];
  private maxEntries: number;
  
  constructor(level: LogLevel = LogLevel.DEBUG, maxEntries: number = 1000) {
    this.level = level;
    this.maxEntries = maxEntries;
  }
  
  log(entry: LogEntry): void {
    if (entry.level < this.level) return;
    
    this.entries.push(entry);
    
    // Remove old entries if we exceed the limit
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
  }
  
  getEntries(level?: LogLevel, limit?: number): LogEntry[] {
    let filtered = this.entries;
    
    if (level !== undefined) {
      filtered = filtered.filter(entry => entry.level >= level);
    }
    
    if (limit) {
      filtered = filtered.slice(-limit);
    }
    
    return filtered;
  }
  
  clear(): void {
    this.entries = [];
  }
}

/**
 * Main logger class
 */
export class Logger {
  private transports: LogTransport[] = [];
  private context?: string;
  
  constructor(context?: string) {
    this.context = context;
  }
  
  /**
   * Add a transport
   */
  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }
  
  /**
   * Remove a transport
   */
  removeTransport(name: string): void {
    this.transports = this.transports.filter(t => t.name !== name);
  }
  
  /**
   * Get a transport by name
   */
  getTransport(name: string): LogTransport | undefined {
    return this.transports.find(t => t.name === name);
  }
  
  /**
   * Create a child logger with additional context
   */
  child(context: string): Logger {
    const childContext = this.context ? `${this.context}.${context}` : context;
    const child = new Logger(childContext);
    child.transports = [...this.transports];
    return child;
  }
  
  /**
   * Log a debug message
   */
  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, args);
  }
  
  /**
   * Log an info message
   */
  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, args);
  }
  
  /**
   * Log a warning message
   */
  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, args);
  }
  
  /**
   * Log an error message
   */
  error(message: string, error?: Error, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, args, error);
  }
  
  /**
   * Log with metadata
   */
  logWithMetadata(
    level: LogLevel,
    message: string,
    metadata: Record<string, any>,
    ...args: any[]
  ): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      args,
      context: this.context,
      metadata
    };
    
    this.transports.forEach(transport => {
      try {
        transport.log(entry);
      } catch (error) {
        console.error(`Error in transport '${transport.name}':`, error);
      }
    });
  }
  
  private log(level: LogLevel, message: string, args: any[], error?: Error): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      args,
      context: this.context,
      error
    };
    
    this.transports.forEach(transport => {
      try {
        transport.log(entry);
      } catch (error) {
        console.error(`Error in transport '${transport.name}':`, error);
      }
    });
  }
}

/**
 * Error handling utilities
 */
export class DicomError extends Error {
  public readonly code: string;
  public readonly context?: string;
  public readonly metadata?: Record<string, any>;
  public readonly timestamp: number;
  
  constructor(
    message: string,
    code: string,
    context?: string,
    metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'DicomError';
    this.code = code;
    this.context = context;
    this.metadata = metadata;
    this.timestamp = Date.now();
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DicomError);
    }
  }
}

/**
 * Specific error types
 */
export class ImageLoadError extends DicomError {
  constructor(imageId: string, originalError?: Error) {
    super(
      `Failed to load image: ${imageId}`,
      'IMAGE_LOAD_ERROR',
      'ImageLoader',
      { imageId, originalError: originalError?.message }
    );
  }
}

export class NetworkError extends DicomError {
  constructor(url: string, status?: number, originalError?: Error) {
    super(
      `Network request failed: ${url}`,
      'NETWORK_ERROR',
      'Network',
      { url, status, originalError: originalError?.message }
    );
  }
}

export class ValidationError extends DicomError {
  constructor(field: string, value: any, expectedType: string) {
    super(
      `Validation failed for field '${field}': expected ${expectedType}, got ${typeof value}`,
      'VALIDATION_ERROR',
      'Validation',
      { field, value, expectedType }
    );
  }
}

export class ConfigurationError extends DicomError {
  constructor(key: string, value: any, reason: string) {
    super(
      `Configuration error for '${key}': ${reason}`,
      'CONFIGURATION_ERROR',
      'Configuration',
      { key, value, reason }
    );
  }
}

/**
 * Error handler class
 */
export class ErrorHandler {
  private logger: Logger;
  private errorCallbacks = new Map<string, Array<(error: Error) => void>>();
  
  constructor(logger: Logger) {
    this.logger = logger;
    
    // Global error handlers
    if (typeof window !== 'undefined') {
      window.addEventListener('error', this.handleGlobalError.bind(this));
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    }
  }
  
  /**
   * Handle an error
   */
  handleError(error: Error, context?: string): void {
    // Log the error
    this.logger.error(
      error.message,
      error,
      { stack: error.stack, context }
    );
    
    // Notify error callbacks
    const callbacks = this.errorCallbacks.get(error.constructor.name) || [];
    const globalCallbacks = this.errorCallbacks.get('*') || [];
    
    [...callbacks, ...globalCallbacks].forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        this.logger.error('Error in error callback', callbackError as Error);
      }
    });
  }
  
  /**
   * Register an error callback
   */
  onError(errorType: string, callback: (error: Error) => void): () => void {
    let callbacks = this.errorCallbacks.get(errorType);
    if (!callbacks) {
      callbacks = [];
      this.errorCallbacks.set(errorType, callbacks);
    }
    
    callbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.errorCallbacks.get(errorType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
          if (callbacks.length === 0) {
            this.errorCallbacks.delete(errorType);
          }
        }
      }
    };
  }
  
  /**
   * Create an error boundary for async operations
   */
  async withErrorBoundary<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.handleError(error as Error, context);
      throw error;
    }
  }
  
  /**
   * Create a safe wrapper for functions
   */
  safe<T extends (...args: any[]) => any>(
    fn: T,
    context?: string
  ): (...args: Parameters<T>) => ReturnType<T> | undefined {
    return (...args: Parameters<T>) => {
      try {
        return fn(...args);
      } catch (error) {
        this.handleError(error as Error, context);
        return undefined;
      }
    };
  }
  
  private handleGlobalError(event: ErrorEvent): void {
    const error = new Error(event.message);
    error.stack = `${event.filename}:${event.lineno}:${event.colno}`;
    this.handleError(error, 'Global');
  }
  
  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    this.handleError(error, 'UnhandledPromise');
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private logger: Logger;
  private metrics = new Map<string, number[]>();
  
  constructor(logger: Logger) {
    this.logger = logger;
  }
  
  /**
   * Start a performance measurement
   */
  start(name: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.recordMetric(name, duration);
      this.logger.debug(`Performance: ${name} took ${duration.toFixed(2)}ms`);
    };
  }
  
  /**
   * Measure an async operation
   */
  async measure<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const end = this.start(name);
    try {
      return await operation();
    } finally {
      end();
    }
  }
  
  /**
   * Record a metric value
   */
  recordMetric(name: string, value: number): void {
    let values = this.metrics.get(name);
    if (!values) {
      values = [];
      this.metrics.set(name, values);
    }
    
    values.push(value);
    
    // Keep only last 100 values
    if (values.length > 100) {
      values.shift();
    }
  }
  
  /**
   * Get metric statistics
   */
  getMetricStats(name: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    p95: number;
  } | undefined {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) {
      return undefined;
    }
    
    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    const min = sorted[0];
    const max = sorted[count - 1];
    const avg = sorted.reduce((sum, val) => sum + val, 0) / count;
    const p95Index = Math.floor(count * 0.95);
    const p95 = sorted[p95Index];
    
    return { count, min, max, avg, p95 };
  }
  
  /**
   * Get all metrics
   */
  getAllMetrics(): Record<string, ReturnType<PerformanceMonitor['getMetricStats']>> {
    const result: Record<string, any> = {};
    
    for (const name of this.metrics.keys()) {
      result[name] = this.getMetricStats(name);
    }
    
    return result;
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger('DicomViewer');

// Add default console transport
logger.addTransport(new ConsoleTransport(LogLevel.INFO));

/**
 * Global error handler instance
 */
export const errorHandler = new ErrorHandler(logger);

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor(logger);

/**
 * Utility functions
 */
export function createLogger(context: string): Logger {
  return logger.child(context);
}

export function logPerformance<T>(
  name: string,
  operation: () => T
): T {
  const end = performanceMonitor.start(name);
  try {
    return operation();
  } finally {
    end();
  }
}

export async function logAsyncPerformance<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  return performanceMonitor.measure(name, operation);
}