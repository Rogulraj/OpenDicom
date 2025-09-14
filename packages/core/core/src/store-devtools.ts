/**
 * Store DevTools Integration and Async Action Patterns
 * Provides development tools and async action handling for Zustand stores
 */

import { StateCreator } from 'zustand';
import { eventManager } from '@opendicom/events';
import {
  useViewerStore,
  useImageStore,
  useToolStore,
  useUIStore,
  useSettingsStore
} from './stores';

// ============================================================================
// ASYNC ACTION PATTERNS
// ============================================================================

/**
 * Async action wrapper with loading states and error handling
 */
export const createAsyncAction = <T extends any[], R>(
  actionName: string,
  asyncFn: (...args: T) => Promise<R>,
  options: {
    loadingKey?: string;
    successMessage?: string;
    errorMessage?: string;
    retries?: number;
    timeout?: number;
  } = {}
) => {
  const {
    loadingKey = actionName,
    successMessage,
    errorMessage,
    retries = 0,
    timeout = 30000
  } = options;

  return async (...args: T): Promise<R> => {
    const uiStore = useUIStore.getState();
    
    // Set loading state
    uiStore.setLoading(loadingKey, true);
    
    let lastError: Error | null = null;
    let attempt = 0;
    
    while (attempt <= retries) {
      try {
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Action ${actionName} timed out`)), timeout);
        });
        
        // Race between async function and timeout
        const result = await Promise.race([
          asyncFn(...args),
          timeoutPromise
        ]);
        
        // Clear loading state
        uiStore.setLoading(loadingKey, false);
        
        // Show success message if provided
        if (successMessage) {
          uiStore.addNotification({
            type: 'success',
            title: 'Success',
            message: successMessage,
            duration: 3000
          });
        }
        
        // Emit success event
        await eventManager.emit('async-action:success', {
          actionName,
          args,
          result,
          attempt: attempt + 1
        });
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;
        
        // Emit retry event if we're going to retry
        if (attempt <= retries) {
          await eventManager.emit('async-action:retry', {
            actionName,
            args,
            error: lastError,
            attempt
          });
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
        }
      }
    }
    
    // Clear loading state
    uiStore.setLoading(loadingKey, false);
    
    // Show error message
    const finalErrorMessage = errorMessage || `${actionName} failed: ${lastError?.message}`;
    uiStore.addNotification({
      type: 'error',
      title: 'Error',
      message: finalErrorMessage,
      duration: 5000
    });
    
    // Emit error event
    await eventManager.emit('async-action:error', {
      actionName,
      args,
      error: lastError!,
      attempts: attempt
    });
    
    throw lastError;
  };
};

/**
 * Batch action executor for multiple async operations
 */
export const createBatchAction = <T>(
  actionName: string,
  items: T[],
  asyncFn: (item: T, index: number) => Promise<void>,
  options: {
    concurrency?: number;
    failFast?: boolean;
    progressCallback?: (completed: number, total: number) => void;
  } = {}
) => {
  const { concurrency = 3, failFast = false, progressCallback } = options;
  
  return createAsyncAction(
    actionName,
    async () => {
      const results: Array<{ success: boolean; error?: Error; index: number }> = [];
      let completed = 0;
      
      // Process items in batches
      for (let i = 0; i < items.length; i += concurrency) {
        const batch = items.slice(i, i + concurrency);
        const batchPromises = batch.map(async (item, batchIndex) => {
          const globalIndex = i + batchIndex;
          try {
            await asyncFn(item, globalIndex);
            completed++;
            progressCallback?.(completed, items.length);
            return { success: true, index: globalIndex };
          } catch (error) {
            completed++;
            progressCallback?.(completed, items.length);
            const result = {
              success: false,
              error: error instanceof Error ? error : new Error(String(error)),
              index: globalIndex
            };
            
            if (failFast) {
              throw error;
            }
            
            return result;
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }
      
      const errors = results.filter(r => !r.success);
      if (errors.length > 0 && failFast) {
        throw new Error(`Batch operation failed: ${errors.length} errors`);
      }
      
      return {
        total: items.length,
        successful: results.filter(r => r.success).length,
        failed: errors.length,
        errors
      };
    },
    {
      loadingKey: `batch-${actionName}`,
      successMessage: `Batch ${actionName} completed`,
      errorMessage: `Batch ${actionName} failed`
    }
  );
};

// ============================================================================
// DEVTOOLS MIDDLEWARE
// ============================================================================

/**
 * Enhanced devtools middleware with action tracking
 */
export const createDevToolsMiddleware = <T>(
  storeName: string,
  options: {
    enabled?: boolean;
    actionSanitizer?: (action: any) => any;
    stateSanitizer?: (state: T) => any;
    maxAge?: number;
  } = {}
): StateCreator<T, [], [], T> => {
  const {
    enabled = process.env.NODE_ENV === 'development',
    actionSanitizer,
    stateSanitizer,
    maxAge = 50
  } = options;

  return (set, get, api) => {
    if (!enabled || typeof window === 'undefined' || !window.__REDUX_DEVTOOLS_EXTENSION__) {
      return api as T;
    }

    const devtools = window.__REDUX_DEVTOOLS_EXTENSION__.connect({
      name: `OpenDICOM-${storeName}`,
      maxAge,
      actionSanitizer,
      stateSanitizer
    });

    let isRecording = true;
    let actionId = 0;

    // Override set function to track actions
    const enhancedSet: typeof set = (partial, replace, actionName) => {
      const nextState = typeof partial === 'function' ? partial(get()) : partial;
      
      if (isRecording) {
        const action = {
          type: actionName || `@@zustand/action-${++actionId}`,
          payload: typeof partial === 'function' ? '[Function]' : partial,
          timestamp: Date.now()
        };
        
        devtools.send(action, replace ? nextState : { ...get(), ...nextState });
      }
      
      return set(partial, replace, actionName);
    };

    // Listen to devtools messages
    devtools.subscribe((message: any) => {
      if (message.type === 'DISPATCH') {
        switch (message.payload.type) {
          case 'RESET':
            devtools.init(get());
            break;
          case 'COMMIT':
            devtools.init(get());
            break;
          case 'ROLLBACK':
            isRecording = false;
            set(message.state, true);
            isRecording = true;
            break;
          case 'JUMP_TO_STATE':
          case 'JUMP_TO_ACTION':
            isRecording = false;
            set(message.state, true);
            isRecording = true;
            break;
        }
      }
    });

    // Initialize devtools
    devtools.init(get());

    return {
      ...api,
      setState: enhancedSet
    } as T;
  };
};

// ============================================================================
// STORE PERFORMANCE MONITORING
// ============================================================================

export class StorePerformanceMonitor {
  private static instance: StorePerformanceMonitor;
  private metrics: Map<string, {
    actionCount: number;
    totalTime: number;
    averageTime: number;
    lastExecuted: number;
    errors: number;
  }> = new Map();
  
  private subscribers: Set<(metrics: typeof this.metrics) => void> = new Set();

  static getInstance(): StorePerformanceMonitor {
    if (!StorePerformanceMonitor.instance) {
      StorePerformanceMonitor.instance = new StorePerformanceMonitor();
    }
    return StorePerformanceMonitor.instance;
  }

  /**
   * Track action performance
   */
  trackAction<T extends any[], R>(
    actionName: string,
    fn: (...args: T) => R
  ): (...args: T) => R {
    return (...args: T): R => {
      const startTime = performance.now();
      
      try {
        const result = fn(...args);
        
        // Handle async results
        if (result instanceof Promise) {
          return result
            .then((value) => {
              this.recordMetric(actionName, performance.now() - startTime, false);
              return value;
            })
            .catch((error) => {
              this.recordMetric(actionName, performance.now() - startTime, true);
              throw error;
            }) as R;
        }
        
        this.recordMetric(actionName, performance.now() - startTime, false);
        return result;
      } catch (error) {
        this.recordMetric(actionName, performance.now() - startTime, true);
        throw error;
      }
    };
  }

  private recordMetric(actionName: string, executionTime: number, isError: boolean): void {
    const existing = this.metrics.get(actionName) || {
      actionCount: 0,
      totalTime: 0,
      averageTime: 0,
      lastExecuted: 0,
      errors: 0
    };

    const updated = {
      actionCount: existing.actionCount + 1,
      totalTime: existing.totalTime + executionTime,
      averageTime: (existing.totalTime + executionTime) / (existing.actionCount + 1),
      lastExecuted: Date.now(),
      errors: existing.errors + (isError ? 1 : 0)
    };

    this.metrics.set(actionName, updated);
    this.notifySubscribers();
  }

  /**
   * Get performance metrics
   */
  getMetrics(): Record<string, {
    actionCount: number;
    totalTime: number;
    averageTime: number;
    lastExecuted: number;
    errors: number;
    errorRate: number;
  }> {
    const result: Record<string, any> = {};
    
    this.metrics.forEach((metric, actionName) => {
      result[actionName] = {
        ...metric,
        errorRate: metric.actionCount > 0 ? metric.errors / metric.actionCount : 0
      };
    });
    
    return result;
  }

  /**
   * Subscribe to metrics updates
   */
  subscribe(callback: (metrics: typeof this.metrics) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback(this.metrics));
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.notifySubscribers();
  }

  /**
   * Get slow actions (above threshold)
   */
  getSlowActions(thresholdMs: number = 100): Array<{
    name: string;
    averageTime: number;
    actionCount: number;
  }> {
    const slowActions: Array<{ name: string; averageTime: number; actionCount: number }> = [];
    
    this.metrics.forEach((metric, name) => {
      if (metric.averageTime > thresholdMs) {
        slowActions.push({
          name,
          averageTime: metric.averageTime,
          actionCount: metric.actionCount
        });
      }
    });
    
    return slowActions.sort((a, b) => b.averageTime - a.averageTime);
  }
}

// ============================================================================
// STORE DEBUG UTILITIES
// ============================================================================

/**
 * Debug utilities for store inspection
 */
export class StoreDebugger {
  private static instance: StoreDebugger;
  private logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug' = 'info';
  private actionHistory: Array<{
    timestamp: number;
    storeName: string;
    actionName: string;
    payload: any;
    stateBefore: any;
    stateAfter: any;
  }> = [];
  
  private maxHistorySize = 100;

  static getInstance(): StoreDebugger {
    if (!StoreDebugger.instance) {
      StoreDebugger.instance = new StoreDebugger();
    }
    return StoreDebugger.instance;
  }

  setLogLevel(level: typeof this.logLevel): void {
    this.logLevel = level;
  }

  /**
   * Log store action
   */
  logAction(
    storeName: string,
    actionName: string,
    payload: any,
    stateBefore: any,
    stateAfter: any
  ): void {
    if (this.logLevel === 'none') return;

    const entry = {
      timestamp: Date.now(),
      storeName,
      actionName,
      payload,
      stateBefore: this.sanitizeState(stateBefore),
      stateAfter: this.sanitizeState(stateAfter)
    };

    // Add to history
    this.actionHistory.push(entry);
    if (this.actionHistory.length > this.maxHistorySize) {
      this.actionHistory.shift();
    }

    // Console logging
    if (this.shouldLog('debug')) {
      console.group(`🏪 ${storeName}:${actionName}`);
      console.log('Payload:', payload);
      console.log('State Before:', stateBefore);
      console.log('State After:', stateAfter);
      console.groupEnd();
    }
  }

  /**
   * Get action history
   */
  getActionHistory(storeName?: string): typeof this.actionHistory {
    if (storeName) {
      return this.actionHistory.filter(entry => entry.storeName === storeName);
    }
    return [...this.actionHistory];
  }

  /**
   * Clear action history
   */
  clearHistory(): void {
    this.actionHistory = [];
  }

  /**
   * Export debug data
   */
  exportDebugData(): string {
    return JSON.stringify({
      logLevel: this.logLevel,
      actionHistory: this.actionHistory,
      timestamp: Date.now(),
      stores: {
        viewer: useViewerStore.getState(),
        image: useImageStore.getState(),
        tool: useToolStore.getState(),
        ui: useUIStore.getState(),
        settings: useSettingsStore.getState()
      }
    }, null, 2);
  }

  private shouldLog(level: 'error' | 'warn' | 'info' | 'debug'): boolean {
    const levels = ['none', 'error', 'warn', 'info', 'debug'];
    const currentIndex = levels.indexOf(this.logLevel);
    const targetIndex = levels.indexOf(level);
    return currentIndex >= targetIndex;
  }

  private sanitizeState(state: any): any {
    // Remove functions and circular references
    return JSON.parse(JSON.stringify(state, (key, value) => {
      if (typeof value === 'function') return '[Function]';
      if (value instanceof Set) return Array.from(value);
      if (value instanceof Map) return Object.fromEntries(value);
      return value;
    }));
  }
}

// ============================================================================
// GLOBAL INSTANCES AND UTILITIES
// ============================================================================

/**
 * Global performance monitor instance
 */
export const storePerformanceMonitor = StorePerformanceMonitor.getInstance();

/**
 * Global debugger instance
 */
export const storeDebugger = StoreDebugger.getInstance();

/**
 * Initialize dev tools (call this in development)
 */
export const initializeDevTools = (options: {
  enablePerformanceMonitoring?: boolean;
  enableDebugLogging?: boolean;
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
} = {}) => {
  const {
    enablePerformanceMonitoring = true,
    enableDebugLogging = true,
    logLevel = 'info'
  } = options;

  if (enableDebugLogging) {
    storeDebugger.setLogLevel(logLevel);
  }

  if (enablePerformanceMonitoring) {
    // Monitor slow actions and log warnings
    storePerformanceMonitor.subscribe(() => {
      const slowActions = storePerformanceMonitor.getSlowActions(100);
      if (slowActions.length > 0) {
        console.warn('🐌 Slow store actions detected:', slowActions);
      }
    });
  }

  // Add global debug utilities to window in development
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    (window as any).__OPENDICOM_DEBUG__ = {
      stores: {
        viewer: useViewerStore,
        image: useImageStore,
        tool: useToolStore,
        ui: useUIStore,
        settings: useSettingsStore
      },
      debugger: storeDebugger,
      performanceMonitor: storePerformanceMonitor,
      exportDebugData: () => storeDebugger.exportDebugData(),
      getPerformanceMetrics: () => storePerformanceMonitor.getMetrics()
    };
    
    console.log('🔧 OpenDICOM debug tools available at window.__OPENDICOM_DEBUG__');
  }
};

/**
 * React hook for accessing dev tools in components
 */
export const useDevTools = () => {
  return {
    debugger: storeDebugger,
    performanceMonitor: storePerformanceMonitor,
    exportDebugData: () => storeDebugger.exportDebugData(),
    getPerformanceMetrics: () => storePerformanceMonitor.getMetrics(),
    createAsyncAction,
    createBatchAction
  };
};