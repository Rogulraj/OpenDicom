/**
 * Example usage of the @opendicom/core package architecture
 * This demonstrates how to initialize and use the core DICOM viewer system
 */

import { 
  dicomViewerCore, 
  DicomViewerCore,
  DicomViewerConfig,
  Plugin,
  PluginMetadata,
  BasePlugin
} from '@opendicom/core';

// Example plugin implementation
class ExamplePlugin extends BasePlugin {
  constructor() {
    const metadata: PluginMetadata = {
      name: 'example-plugin',
      version: '1.0.0',
      description: 'An example plugin for demonstration',
      author: 'OpenDICOM Team',
      dependencies: [],
      permissions: ['viewport:read', 'config:read']
    };
    
    super(metadata);
  }
  
  async onActivate(): Promise<void> {
    this.logger.info('Example plugin activated');
    
    // Listen to core events
    this.context.eventHub.on('core:initialized', (data) => {
      this.logger.info('Core initialized in', data.initTime, 'ms');
    });
    
    // Access configuration
    const config = this.context.config;
    this.logger.debug('Current viewport config:', config.viewport);
  }
  
  async onDeactivate(): Promise<void> {
    this.logger.info('Example plugin deactivated');
  }
}

// Example usage
async function initializeViewer() {
  try {
    // Custom configuration
    const config: Partial<DicomViewerConfig> = {
      viewport: {
        defaultTool: 'zoom',
        enableAnnotations: true,
        backgroundColor: '#000000'
      },
      logging: {
        level: 'info',
        enableConsole: true,
        enableRemote: false
      },
      performance: {
        enableCaching: true,
        maxCacheSize: 512,
        enablePrefetch: true
      }
    };
    
    // Initialize the core
    await dicomViewerCore.initialize(config);
    
    // Register and activate a plugin
    const examplePlugin = new ExamplePlugin();
    await dicomViewerCore.pluginManager.register(examplePlugin);
    await dicomViewerCore.pluginManager.activate('example-plugin');
    
    // Access various core components
    const systemInfo = dicomViewerCore.getSystemInfo();
    console.log('System Info:', systemInfo);
    
    // Listen to events
    dicomViewerCore.eventHub.on('error:critical', ({ error, context }) => {
      console.error(`Critical error in ${context}:`, error);
    });
    
    // Access stores (from Zustand)
    const { viewerConfigStore, viewportStore } = await import('@opendicom/core');
    
    // Update viewer configuration
    viewerConfigStore.getState().updateConfig({
      enableWebGL: true,
      maxCacheSize: 1024
    });
    
    // Access viewport state
    const viewportState = viewportStore.getState();
    console.log('Current viewport state:', viewportState);
    
    // Register a service
    interface ICustomService {
      processData(data: any): Promise<any>;
    }
    
    class CustomService implements ICustomService {
      async processData(data: any): Promise<any> {
        return { processed: true, data };
      }
    }
    
    dicomViewerCore.serviceContainer.register(
      'ICustomService',
      () => new CustomService(),
      { singleton: true }
    );
    
    // Use the service
    const customService = dicomViewerCore.serviceContainer.resolve<ICustomService>('ICustomService');
    const result = await customService.processData({ test: 'data' });
    console.log('Service result:', result);
    
    console.log('DICOM Viewer Core initialized successfully!');
    
  } catch (error) {
    console.error('Failed to initialize DICOM Viewer:', error);
  }
}

// Example shutdown
async function shutdownViewer() {
  try {
    await dicomViewerCore.shutdown();
    console.log('DICOM Viewer Core shutdown successfully!');
  } catch (error) {
    console.error('Failed to shutdown DICOM Viewer:', error);
  }
}

// Export for use in other modules
export {
  initializeViewer,
  shutdownViewer,
  ExamplePlugin
};

// Auto-initialize if this is the main module
if (typeof window !== 'undefined') {
  // Browser environment
  window.addEventListener('DOMContentLoaded', initializeViewer);
  window.addEventListener('beforeunload', shutdownViewer);
} else if (require.main === module) {
  // Node.js environment
  initializeViewer().catch(console.error);
}