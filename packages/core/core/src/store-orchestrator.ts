/**
 * Store Orchestrator - Cross-store communication patterns and persistence
 * Manages complex interactions between different stores
 */

import { eventManager } from '@opendicom/events';
import {
  useViewerStore,
  useImageStore,
  useToolStore,
  useUIStore,
  useSettingsStore,
  type ViewerState,
  type ImageState,
  type ToolState,
  type UIState,
  type SettingsState
} from './stores';

// ============================================================================
// STORE ORCHESTRATOR CLASS
// ============================================================================

export class StoreOrchestrator {
  private static instance: StoreOrchestrator;
  private subscriptions: (() => void)[] = [];
  private isInitialized = false;

  private constructor() {}

  static getInstance(): StoreOrchestrator {
    if (!StoreOrchestrator.instance) {
      StoreOrchestrator.instance = new StoreOrchestrator();
    }
    return StoreOrchestrator.instance;
  }

  /**
   * Initialize cross-store communication patterns
   */
  initialize(): void {
    if (this.isInitialized) return;

    this.setupViewerStoreIntegrations();
    this.setupImageStoreIntegrations();
    this.setupToolStoreIntegrations();
    this.setupUIStoreIntegrations();
    this.setupSettingsStoreIntegrations();
    this.setupGlobalEventHandlers();

    this.isInitialized = true;
  }

  /**
   * Clean up all subscriptions
   */
  destroy(): void {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions = [];
    this.isInitialized = false;
  }

  // ============================================================================
  // VIEWER STORE INTEGRATIONS
  // ============================================================================

  private setupViewerStoreIntegrations(): void {
    // Sync viewer initialization with settings
    const unsubscribeViewerInit = useViewerStore.subscribe(
      (state) => state.isInitialized,
      (isInitialized, wasInitialized) => {
        if (isInitialized && !wasInitialized) {
          // Apply initial settings when viewer initializes
          const settings = useSettingsStore.getState();
          this.applySettingsToViewer(settings);
          
          // Show initialization notification
          useUIStore.getState().addNotification({
            type: 'success',
            title: 'Viewer Initialized',
            message: `OpenDICOM Viewer v${useViewerStore.getState().version} is ready`,
            duration: 3000
          });
        }
      }
    );

    // Handle layout changes
    const unsubscribeLayout = useViewerStore.subscribe(
      (state) => state.layout,
      (layout, previousLayout) => {
        if (layout.type !== previousLayout?.type) {
          // Update tool states for new layout
          const toolStore = useToolStore.getState();
          
          // Ensure all viewports have default tools
          layout.viewports.forEach(viewportId => {
            if (!toolStore.activeTools[viewportId]) {
              const defaultTool = useSettingsStore.getState().tools.defaultTool;
              toolStore.activateTool(defaultTool, viewportId);
            }
          });
        }
      }
    );

    // Handle performance monitoring
    const unsubscribePerformance = useViewerStore.subscribe(
      (state) => state.performance.memoryUsage,
      (memoryUsage) => {
        if (memoryUsage) {
          const memoryMB = memoryUsage.heapUsed / 1024 / 1024;
          const maxCacheSize = useSettingsStore.getState().viewer.maxCacheSize;
          const maxCacheMB = maxCacheSize / 1024 / 1024;
          
          // Auto-cleanup if memory usage is high
          if (memoryMB > maxCacheMB * 0.8) {
            useImageStore.getState().updateCacheStats({
              totalSize: memoryUsage.heapUsed
            });
            
            // Trigger cache cleanup
            this.performCacheCleanup();
          }
        }
      }
    );

    this.subscriptions.push(unsubscribeViewerInit, unsubscribeLayout, unsubscribePerformance);
  }

  // ============================================================================
  // IMAGE STORE INTEGRATIONS
  // ============================================================================

  private setupImageStoreIntegrations(): void {
    // Auto-prefetch based on settings
    const unsubscribeImageLoaded = useImageStore.subscribe(
      (state) => Object.keys(state.images).length,
      (imageCount) => {
        const settings = useSettingsStore.getState();
        if (settings.viewer.enablePrefetch && imageCount > 0) {
          // Trigger prefetch logic here
          this.handleAutoPrefetch();
        }
      }
    );

    // Update cache statistics
    const unsubscribeCacheStats = useImageStore.subscribe(
      (state) => state.cacheStats,
      (cacheStats) => {
        // Update viewer performance metrics
        const totalSizeMB = cacheStats.totalSize / 1024 / 1024;
        const maxSizeMB = cacheStats.maxSize / 1024 / 1024;
        
        if (totalSizeMB > maxSizeMB * 0.9) {
          useUIStore.getState().addNotification({
            type: 'warning',
            title: 'Cache Nearly Full',
            message: `Image cache: ${Math.round(totalSizeMB)}MB / ${Math.round(maxSizeMB)}MB`,
            duration: 5000
          });
        }
      }
    );

    // Handle image loading errors
    const unsubscribeImageErrors = useImageStore.subscribe(
      (state) => Object.values(state.images).filter(img => img.loadState === 'error').length,
      (errorCount) => {
        if (errorCount > 0) {
          // Show global loading indicator
          useUIStore.getState().setLoading('images', false);
        }
      }
    );

    this.subscriptions.push(unsubscribeImageLoaded, unsubscribeCacheStats, unsubscribeImageErrors);
  }

  // ============================================================================
  // TOOL STORE INTEGRATIONS
  // ============================================================================

  private setupToolStoreIntegrations(): void {
    // Sync tool activation with UI state
    const unsubscribeActiveTool = useToolStore.subscribe(
      (state) => state.activeTools,
      (activeTools, previousActiveTools) => {
        // Update UI to reflect active tools
        Object.entries(activeTools).forEach(([viewportId, toolName]) => {
          const previousTool = previousActiveTools?.[viewportId];
          if (toolName !== previousTool) {
            // Could trigger UI updates here
            eventManager.emit('ui:tool-changed', {
              viewportId,
              toolName,
              previousTool
            });
          }
        });
      }
    );

    // Handle tool configuration changes
    const unsubscribeToolConfig = useToolStore.subscribe(
      (state) => state.toolConfigs,
      (toolConfigs) => {
        // Sync with settings store
        const currentSettings = useSettingsStore.getState();
        const toolSensitivity: Record<string, number> = {};
        
        Object.entries(toolConfigs).forEach(([toolName, config]) => {
          if (config.configuration.sensitivity !== undefined) {
            toolSensitivity[toolName] = config.configuration.sensitivity;
          }
        });
        
        if (Object.keys(toolSensitivity).length > 0) {
          useSettingsStore.getState().updateToolSettings({
            toolSensitivity: {
              ...currentSettings.tools.toolSensitivity,
              ...toolSensitivity
            }
          });
        }
      }
    );

    this.subscriptions.push(unsubscribeActiveTool, unsubscribeToolConfig);
  }

  // ============================================================================
  // UI STORE INTEGRATIONS
  // ============================================================================

  private setupUIStoreIntegrations(): void {
    // Sync theme changes with CSS variables
    const unsubscribeTheme = useUIStore.subscribe(
      (state) => state.theme,
      (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        
        // Apply theme-specific settings
        if (theme === 'dark') {
          document.documentElement.style.setProperty('--background-color', '#1a1a1a');
          document.documentElement.style.setProperty('--text-color', '#ffffff');
        } else if (theme === 'light') {
          document.documentElement.style.setProperty('--background-color', '#ffffff');
          document.documentElement.style.setProperty('--text-color', '#000000');
        }
      }
    );

    // Handle panel visibility changes
    const unsubscribePanels = useUIStore.subscribe(
      (state) => state.panels,
      (panels) => {
        // Emit events for panel changes
        Object.entries(panels).forEach(([panel, visible]) => {
          eventManager.emit('ui:panel-toggled', {
            panel,
            visible
          });
        });
      }
    );

    // Auto-remove expired notifications
    const unsubscribeNotifications = useUIStore.subscribe(
      (state) => state.notifications,
      (notifications) => {
        notifications.forEach(notification => {
          if (notification.duration && !notification.actions) {
            setTimeout(() => {
              useUIStore.getState().removeNotification(notification.id);
            }, notification.duration);
          }
        });
      }
    );

    this.subscriptions.push(unsubscribeTheme, unsubscribePanels, unsubscribeNotifications);
  }

  // ============================================================================
  // SETTINGS STORE INTEGRATIONS
  // ============================================================================

  private setupSettingsStoreIntegrations(): void {
    // Apply viewer settings changes
    const unsubscribeViewerSettings = useSettingsStore.subscribe(
      (state) => state.viewer,
      (viewerSettings) => {
        // Update image cache max size
        useImageStore.getState().updateCacheStats({
          maxSize: viewerSettings.maxCacheSize
        });
        
        // Update prefetch settings
        if (!viewerSettings.enablePrefetch) {
          // Clear prefetch queue
          useImageStore.setState((state) => {
            state.prefetchQueue = [];
          });
        }
      }
    );

    // Apply display settings changes
    const unsubscribeDisplaySettings = useSettingsStore.subscribe(
      (state) => state.display,
      (displaySettings) => {
        // Apply to all active viewports
        const activeViewports = useViewerStore.getState().layout.viewports;
        activeViewports.forEach(viewportId => {
          eventManager.emit('viewport:display-settings-changed', {
            viewportId,
            settings: displaySettings
          });
        });
      }
    );

    // Apply tool settings changes
    const unsubscribeToolSettings = useSettingsStore.subscribe(
      (state) => state.tools,
      (toolSettings) => {
        // Update tool configurations
        const toolStore = useToolStore.getState();
        Object.entries(toolSettings.toolSensitivity).forEach(([toolName, sensitivity]) => {
          if (toolStore.toolConfigs[toolName]) {
            toolStore.updateToolConfig(toolName, { sensitivity });
          }
        });
        
        // Set default tool for new viewports
        const activeViewports = useViewerStore.getState().layout.viewports;
        activeViewports.forEach(viewportId => {
          if (!toolStore.activeTools[viewportId]) {
            toolStore.activateTool(toolSettings.defaultTool, viewportId);
          }
        });
      }
    );

    this.subscriptions.push(unsubscribeViewerSettings, unsubscribeDisplaySettings, unsubscribeToolSettings);
  }

  // ============================================================================
  // GLOBAL EVENT HANDLERS
  // ============================================================================

  private setupGlobalEventHandlers(): void {
    // Handle system errors
    eventManager.on('system:error', (data) => {
      useViewerStore.getState().setError(data.error.message);
      useUIStore.getState().setLoading('global', false);
    });

    // Handle viewport events
    eventManager.on('viewport:created', (data) => {
      const settings = useSettingsStore.getState();
      useToolStore.getState().activateTool(settings.tools.defaultTool, data.viewportId);
    });

    // Handle image events
    eventManager.on('image:loading', (data) => {
      useUIStore.getState().setLoading(`image-${data.imageId}`, true);
    });

    eventManager.on('image:loaded', (data) => {
      useUIStore.getState().setLoading(`image-${data.imageId}`, false);
    });

    eventManager.on('image:error', (data) => {
      useUIStore.getState().setLoading(`image-${data.imageId}`, false);
    });
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private applySettingsToViewer(settings: SettingsState): void {
    // Apply viewer settings
    useImageStore.getState().updateCacheStats({
      maxSize: settings.viewer.maxCacheSize
    });

    // Apply display settings to active viewports
    const activeViewports = useViewerStore.getState().layout.viewports;
    activeViewports.forEach(viewportId => {
      eventManager.emit('viewport:display-settings-changed', {
        viewportId,
        settings: settings.display
      });
    });

    // Apply tool settings
    Object.entries(settings.tools.toolSensitivity).forEach(([toolName, sensitivity]) => {
      useToolStore.getState().updateToolConfig(toolName, { sensitivity });
    });
  }

  private handleAutoPrefetch(): void {
    const settings = useSettingsStore.getState();
    const imageStore = useImageStore.getState();
    const loadedImages = Object.keys(imageStore.images).filter(
      id => imageStore.images[id].loadState === 'loaded'
    );

    if (loadedImages.length > 0 && settings.viewer.enablePrefetch) {
      // Simple prefetch logic - prefetch next N images
      const lastImageId = loadedImages[loadedImages.length - 1];
      const nextImageIds = this.generateNextImageIds(lastImageId, settings.viewer.prefetchCount);
      
      if (nextImageIds.length > 0) {
        imageStore.prefetchImages(nextImageIds);
      }
    }
  }

  private generateNextImageIds(currentImageId: string, count: number): string[] {
    // Simple implementation - generate sequential IDs
    // In a real implementation, this would be based on series/study structure
    const currentNum = parseInt(currentImageId.replace(/\D/g, '')) || 0;
    return Array.from({ length: count }, (_, i) => `image-${currentNum + i + 1}`);
  }

  private performCacheCleanup(): void {
    const imageStore = useImageStore.getState();
    const images = Object.values(imageStore.images);
    
    // Find oldest images to evict
    const sortedImages = images
      .filter(img => img.loadState === 'loaded')
      .sort((a, b) => (a.loadTime || 0) - (b.loadTime || 0));
    
    // Evict oldest 25% of images
    const evictCount = Math.floor(sortedImages.length * 0.25);
    for (let i = 0; i < evictCount; i++) {
      imageStore.evictImage(sortedImages[i].id, 'memory-pressure');
    }
  }

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  /**
   * Get current state snapshot from all stores
   */
  getGlobalState() {
    return {
      viewer: useViewerStore.getState(),
      image: useImageStore.getState(),
      tool: useToolStore.getState(),
      ui: useUIStore.getState(),
      settings: useSettingsStore.getState()
    };
  }

  /**
   * Reset all stores to initial state
   */
  resetAllStores(): void {
    useViewerStore.getState().shutdown();
    useImageStore.getState().clearCache();
    useUIStore.getState().clearNotifications();
    useSettingsStore.getState().resetToDefaults();
    
    // Clear active tools
    useToolStore.setState((state) => {
      state.activeTools = {};
      state.activeInteractions = {};
    });
  }

  /**
   * Export all store states for backup/restore
   */
  exportState(): string {
    const state = this.getGlobalState();
    return JSON.stringify({
      viewer: {
        layout: state.viewer.layout,
        version: state.viewer.version
      },
      ui: {
        theme: state.ui.theme,
        panels: state.ui.panels
      },
      settings: {
        viewer: state.settings.viewer,
        display: state.settings.display,
        tools: state.settings.tools,
        performance: state.settings.performance,
        accessibility: state.settings.accessibility
      }
    }, null, 2);
  }

  /**
   * Import and restore store states
   */
  importState(stateJson: string): void {
    try {
      const state = JSON.parse(stateJson);
      
      if (state.viewer?.layout) {
        useViewerStore.getState().setLayout(state.viewer.layout);
      }
      
      if (state.ui?.theme) {
        useUIStore.getState().setTheme(state.ui.theme);
      }
      
      if (state.ui?.panels) {
        Object.entries(state.ui.panels).forEach(([panel, visible]) => {
          const currentPanels = useUIStore.getState().panels;
          if (currentPanels[panel as keyof typeof currentPanels] !== visible) {
            useUIStore.getState().togglePanel(panel as keyof typeof currentPanels);
          }
        });
      }
      
      if (state.settings) {
        const settingsStore = useSettingsStore.getState();
        if (state.settings.viewer) settingsStore.updateViewerSettings(state.settings.viewer);
        if (state.settings.display) settingsStore.updateDisplaySettings(state.settings.display);
        if (state.settings.tools) settingsStore.updateToolSettings(state.settings.tools);
        if (state.settings.performance) settingsStore.updatePerformanceSettings(state.settings.performance);
        if (state.settings.accessibility) settingsStore.updateAccessibilitySettings(state.settings.accessibility);
      }
    } catch (error) {
      console.error('Failed to import state:', error);
      throw new Error('Invalid state format');
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE AND UTILITIES
// ============================================================================

/**
 * Global store orchestrator instance
 */
export const storeOrchestrator = StoreOrchestrator.getInstance();

/**
 * Initialize store orchestrator (call this once in your app)
 */
export const initializeStoreOrchestrator = () => {
  storeOrchestrator.initialize();
};

/**
 * Cleanup store orchestrator
 */
export const destroyStoreOrchestrator = () => {
  storeOrchestrator.destroy();
};

/**
 * Utility hooks for cross-store operations
 */
export const useStoreOrchestrator = () => {
  return {
    getGlobalState: () => storeOrchestrator.getGlobalState(),
    resetAllStores: () => storeOrchestrator.resetAllStores(),
    exportState: () => storeOrchestrator.exportState(),
    importState: (state: string) => storeOrchestrator.importState(state)
  };
};