import { EventEmitter } from '../events/EventEmitter';

interface PerformanceMetric {
  timestamp: number;
  duration: number;
  type: string;
  details: Record<string, any>;
}

interface ResourceMetric {
  timestamp: number;
  type: 'memory' | 'cpu' | 'network' | 'rendering';
  value: number;
  details: Record<string, any>;
}

interface ErrorEvent {
  timestamp: number;
  type: string;
  error: Error;
  context: Record<string, any>;
}

interface MonitoringOptions {
  sampleInterval: number;
  maxMetricsAge: number;
  maxMetricsCount: number;
  errorReportingEndpoint?: string;
  metricsReportingEndpoint?: string;
}

export class PerformanceMonitor extends EventEmitter {
  private options: MonitoringOptions;
  private metrics: PerformanceMetric[] = [];
  private resourceMetrics: ResourceMetric[] = [];
  private errors: ErrorEvent[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;

  constructor(options: Partial<MonitoringOptions> = {}) {
    super();
    this.options = {
      sampleInterval: options.sampleInterval || 5000, // 5 seconds
      maxMetricsAge: options.maxMetricsAge || 3600000, // 1 hour
      maxMetricsCount: options.maxMetricsCount || 1000,
      errorReportingEndpoint: options.errorReportingEndpoint,
      metricsReportingEndpoint: options.metricsReportingEndpoint
    };
  }

  public startMonitoring(): void {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, this.options.sampleInterval);

    this.setupPerformanceObserver();
    this.setupErrorHandling();
  }

  private setupPerformanceObserver(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;

    // Observe long tasks
    const longTaskObserver = new PerformanceObserver(entries => {
      entries.getEntries().forEach(entry => {
        this.recordPerformanceMetric('longTask', entry.duration, {
          startTime: entry.startTime,
          name: entry.name
        });
      });
    });

    try {
      longTaskObserver.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      console.warn('LongTask observation not supported:', e);
    }

    // Observe resource timing
    const resourceObserver = new PerformanceObserver(entries => {
      entries.getEntries().forEach(entry => {
        if (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest') {
          this.recordResourceMetric('network', entry.duration, {
            url: entry.name,
            transferSize: (entry as any).transferSize,
            initiatorType: entry.initiatorType
          });
        }
      });
    });

    try {
      resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (e) {
      console.warn('Resource timing observation not supported:', e);
    }
  }

  private setupErrorHandling(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      this.recordError('uncaught', event.error, {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.recordError('unhandledRejection', event.reason, {
        promise: event.promise
      });
    });
  }

  private async collectMetrics(): Promise<void> {
    try {
      // Collect memory metrics if available
      if ((window.performance as any).memory) {
        const memory = (window.performance as any).memory;
        this.recordResourceMetric('memory', memory.usedJSHeapSize, {
          totalHeapSize: memory.totalJSHeapSize,
          heapLimit: memory.jsHeapSizeLimit
        });
      }

      // Collect rendering metrics
      if (window.requestAnimationFrame) {
        let lastFrameTime = performance.now();
        window.requestAnimationFrame(() => {
          const frameTime = performance.now() - lastFrameTime;
          this.recordResourceMetric('rendering', frameTime, {
            fps: 1000 / frameTime
          });
        });
      }

      // Clean up old metrics
      this.cleanupOldMetrics();

      // Report metrics if endpoint is configured
      if (this.options.metricsReportingEndpoint) {
        await this.reportMetrics();
      }
    } catch (error) {
      console.error('Error collecting metrics:', error);
      this.recordError('metricCollection', error as Error, {});
    }
  }

  public recordPerformanceMetric(
    type: string,
    duration: number,
    details: Record<string, any> = {}
  ): void {
    this.metrics.push({
      timestamp: Date.now(),
      duration,
      type,
      details
    });

    this.emit('metricRecorded', {
      type,
      duration,
      details
    });

    if (this.metrics.length > this.options.maxMetricsCount) {
      this.metrics.shift();
    }
  }

  public recordResourceMetric(
    type: 'memory' | 'cpu' | 'network' | 'rendering',
    value: number,
    details: Record<string, any> = {}
  ): void {
    this.resourceMetrics.push({
      timestamp: Date.now(),
      type,
      value,
      details
    });

    this.emit('resourceMetricRecorded', {
      type,
      value,
      details
    });

    if (this.resourceMetrics.length > this.options.maxMetricsCount) {
      this.resourceMetrics.shift();
    }
  }

  public recordError(
    type: string,
    error: Error,
    context: Record<string, any> = {}
  ): void {
    const errorEvent: ErrorEvent = {
      timestamp: Date.now(),
      type,
      error,
      context
    };

    this.errors.push(errorEvent);
    this.emit('errorRecorded', errorEvent);

    if (this.options.errorReportingEndpoint) {
      this.reportError(errorEvent).catch(e => {
        console.error('Failed to report error:', e);
      });
    }
  }

  private cleanupOldMetrics(): void {
    const now = Date.now();
    const cutoff = now - this.options.maxMetricsAge;

    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoff);
    this.resourceMetrics = this.resourceMetrics.filter(
      metric => metric.timestamp > cutoff
    );
    this.errors = this.errors.filter(error => error.timestamp > cutoff);
  }

  private async reportMetrics(): Promise<void> {
    if (!this.options.metricsReportingEndpoint) return;

    const metricsPayload = {
      timestamp: Date.now(),
      metrics: this.metrics,
      resourceMetrics: this.resourceMetrics,
      errors: this.errors.map(error => ({
        ...error,
        error: {
          name: error.error.name,
          message: error.error.message,
          stack: error.error.stack
        }
      }))
    };

    try {
      const response = await fetch(this.options.metricsReportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metricsPayload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Clear reported metrics
      this.metrics = [];
      this.resourceMetrics = [];
      this.errors = [];
    } catch (error) {
      console.error('Failed to report metrics:', error);
    }
  }

  private async reportError(errorEvent: ErrorEvent): Promise<void> {
    if (!this.options.errorReportingEndpoint) return;

    const errorPayload = {
      ...errorEvent,
      error: {
        name: errorEvent.error.name,
        message: errorEvent.error.message,
        stack: errorEvent.error.stack
      }
    };

    try {
      const response = await fetch(this.options.errorReportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorPayload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to report error:', error);
    }
  }

  public getMetricsSummary(): {
    performance: Record<string, number>;
    resources: Record<string, number>;
    errors: Record<string, number>;
  } {
    const summary = {
      performance: {},
      resources: {},
      errors: {}
    };

    // Aggregate performance metrics
    this.metrics.forEach(metric => {
      if (!summary.performance[metric.type]) {
        summary.performance[metric.type] = 0;
      }
      summary.performance[metric.type] += metric.duration;
    });

    // Average performance metrics
    Object.keys(summary.performance).forEach(key => {
      const count = this.metrics.filter(m => m.type === key).length;
      summary.performance[key] /= count || 1;
    });

    // Aggregate resource metrics
    this.resourceMetrics.forEach(metric => {
      if (!summary.resources[metric.type]) {
        summary.resources[metric.type] = 0;
      }
      summary.resources[metric.type] += metric.value;
    });

    // Average resource metrics
    Object.keys(summary.resources).forEach(key => {
      const count = this.resourceMetrics.filter(m => m.type === key).length;
      summary.resources[key] /= count || 1;
    });

    // Count errors by type
    this.errors.forEach(error => {
      if (!summary.errors[error.type]) {
        summary.errors[error.type] = 0;
      }
      summary.errors[error.type]++;
    });

    return summary;
  }

  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
  }

  public destroy(): void {
    this.stopMonitoring();
    this.removeAllListeners();
    this.metrics = [];
    this.resourceMetrics = [];
    this.errors = [];
  }
}