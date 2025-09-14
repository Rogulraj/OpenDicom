// Core DICOM viewer functionality
export * from './types';
export * from './dicom';
export * from './image';
export * from './utils';

// Architecture components
export * from './plugins';
export * from './events';
export * from './stores';
export * from './store-orchestrator';
export * from './store-devtools';
export * from './services';
export * from './config';
export * from './logger';

// Version information
export const VERSION = '0.1.0';

// Re-export cornerstone types for convenience
export type { Image as CornerstoneImage } from 'cornerstone-core';

// Core initialization
import { PluginManager, PluginContext } from './plugins';
import { eventHub } from './events';
import { serviceContainer, registerCoreServices } from './services';
import { configManager, DicomViewerConfig } from './config';
import { logger, errorHandler, performanceMonitor } from './logger';

/**
 * Core DICOM viewer instance
 */
export class DicomViewerCore {
  private static instance: DicomViewerCore;
  private initialized = false;
  
  public readonly pluginManager: PluginManager;
  public readonly eventHub = eventHub;
  public readonly serviceContainer = serviceContainer;
  public readonly configManager = configManager;
  public readonly logger = logger;
  public readonly errorHandler = errorHandler;
  public readonly performanceMonitor = performanceMonitor;
  
  private constructor() {
    // Create plugin context
    const pluginContext: PluginContext = {
      config: this.configManager.getConfig(),
      eventHub: this.eventHub,
      services: new Map(),
      logger: {
        debug: (message, ...args) => this.logger.debug(message, ...args),
        info: (message, ...args) => this.logger.info(message, ...args),
        warn: (message, ...args) => this.logger.warn(message, ...args),
        error: (message, ...args) => this.logger.error(message, undefined, ...args)
      }
    };
    
    this.pluginManager = new PluginManager(pluginContext);
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): DicomViewerCore {
    if (!DicomViewerCore.instance) {
      DicomViewerCore.instance = new DicomViewerCore();
    }
    return DicomViewerCore.instance;
  }
  
  /**
   * Initialize the DICOM viewer core
   */
  public async initialize(config: Partial<DicomViewerConfig> = {}): Promise<void> {
    if (this.initialized) {
      this.logger.warn('DicomViewerCore is already initialized');
      return;
    }
    
    const startTime = performance.now();
    
    try {
      this.logger.info('Initializing DICOM Viewer Core...');
      
      // Update configuration
      this.configManager.updateConfig(config);
      
      // Register core services
      registerCoreServices();
      
      // Initialize cornerstone if in browser environment
      if (typeof window !== 'undefined') {
        // Cornerstone initialization will be handled by the viewport package
        this.logger.debug('Browser environment detected');
      }
      
      // Set up error handling
      this.setupErrorHandling();
      
      // Set up configuration watchers
      this.setupConfigWatchers();
      
      this.initialized = true;
      
      const initTime = performance.now() - startTime;
      this.logger.info(`DICOM Viewer Core initialized successfully in ${initTime.toFixed(2)}ms`);
      
      // Emit initialization event
      this.eventHub.emit('core:initialized', { initTime });
      
    } catch (error) {
      this.logger.error('Failed to initialize DICOM Viewer Core', error as Error);
      throw error;
    }
  }
  
  /**
   * Shutdown the DICOM viewer core
   */
  public async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }
    
    this.logger.info('Shutting down DICOM Viewer Core...');
    
    try {
      // Deactivate all plugins
      const activePlugins = this.pluginManager.getActivePlugins();
      for (const plugin of activePlugins) {
        await this.pluginManager.deactivate(plugin.metadata.name);
      }
      
      // Clear service container
      this.serviceContainer.clear();
      
      // Clear event listeners
      this.eventHub.removeAllListeners();
      
      this.initialized = false;
      
      this.logger.info('DICOM Viewer Core shutdown complete');
      
    } catch (error) {
      this.logger.error('Error during shutdown', error as Error);
      throw error;
    }
  }
  
  /**
   * Check if the core is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Get system information
   */
  public getSystemInfo(): {
    version: string;
    initialized: boolean;
    pluginCount: number;
    activePluginCount: number;
    serviceCount: number;
    memoryUsage?: MemoryInfo;
  } {
    return {
      version: VERSION,
      initialized: this.initialized,
      pluginCount: this.pluginManager.getAllPlugins().length,
      activePluginCount: this.pluginManager.getActivePlugins().length,
      serviceCount: this.serviceContainer.getRegisteredServices().length,
      memoryUsage: (performance as any).memory
    };
  }
  
  private setupErrorHandling(): void {
    // Handle critical errors
    this.errorHandler.onError('*', (error) => {
      this.eventHub.emit('error:critical', { error, context: 'Core' });
    });
    
    // Handle plugin errors
    this.pluginManager.on('plugin:error', ({ plugin, error }) => {
      this.logger.error(`Plugin error in '${plugin.metadata.name}':`, error);
    });
  }
  
  private setupConfigWatchers(): void {
    // Watch for logging level changes
    this.configManager.watch('logging.level', (newLevel) => {
      const consoleTransport = this.logger.getTransport('console');
      if (consoleTransport) {
        (consoleTransport as any).level = this.getLogLevelFromString(newLevel);
      }
    });
    
    // Watch for performance settings changes
    this.configManager.watch('performance', (newPerformance) => {
      this.logger.debug('Performance settings updated', newPerformance);
    });
  }
  
  private getLogLevelFromString(level: string): number {
    const levels: Record<string, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    return levels[level] || 1;
  }
}

// Global core instance
const core = DicomViewerCore.getInstance();

// Legacy compatibility functions
export function initializeDicomViewer(config: Partial<DicomViewerConfig> = {}): Promise<DicomViewerConfig> {
  return core.initialize(config).then(() => core.configManager.getConfig());
}

export function getVersion(): string {
  return VERSION;
}

// Export the core instance
export { core as dicomViewerCore };

// Export core types for external use
export type { DicomViewerCore };