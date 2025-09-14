/**
 * Enhanced Zustand stores with domain-specific architecture
 * Implements comprehensive state management for DICOM viewer
 */

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { eventManager } from '@opendicom/events';
import type { DicomMetadata, ViewportType, ToolState, Camera, Annotation } from '@opendicom/events';

// ============================================================================
// VIEWER STORE - Core viewer state and lifecycle management
// ============================================================================

export interface ViewerState {
  // Core state
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  version: string;
  
  // Layout and viewports
  layout: {
    type: '1x1' | '2x1' | '2x2' | '3x3' | 'custom';
    viewports: string[];
    activeViewportId: string | null;
  };
  
  // Performance metrics
  performance: {
    fps: Record<string, number>;
    renderTimes: Record<string, number[]>;
    memoryUsage: {
      heapUsed: number;
      heapTotal: number;
      timestamp: Date;
    } | null;
  };
  
  // Actions
  initialize: (version: string) => Promise<void>;
  shutdown: () => Promise<void>;
  setError: (error: string | null) => void;
  setLayout: (layout: ViewerState['layout']) => void;
  setActiveViewport: (viewportId: string | null) => void;
  updatePerformance: (viewportId: string, fps: number, renderTime: number) => void;
  updateMemoryUsage: (usage: { heapUsed: number; heapTotal: number }) => void;
}

export const useViewerStore = create<ViewerState>()()
  (devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        isInitialized: false,
        isLoading: false,
        error: null,
        version: '0.0.0',
        layout: {
          type: '1x1',
          viewports: ['viewport-1'],
          activeViewportId: 'viewport-1'
        },
        performance: {
          fps: {},
          renderTimes: {},
          memoryUsage: null
        },
        
        // Actions
        initialize: async (version: string) => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });
          
          try {
            // Emit initialization event
            await eventManager.emit('system:initialized', {
              timestamp: new Date(),
              version
            });
            
            set((state) => {
              state.isInitialized = true;
              state.isLoading = false;
              state.version = version;
            });
          } catch (error) {
            set((state) => {
              state.isLoading = false;
              state.error = error instanceof Error ? error.message : 'Initialization failed';
            });
            throw error;
          }
        },
        
        shutdown: async () => {
          try {
            await eventManager.emit('system:shutdown', {
              timestamp: new Date(),
              reason: 'User initiated'
            });
            
            set((state) => {
              state.isInitialized = false;
              state.layout.activeViewportId = null;
              state.performance = {
                fps: {},
                renderTimes: {},
                memoryUsage: null
              };
            });
          } catch (error) {
            console.error('Shutdown error:', error);
          }
        },
        
        setError: (error: string | null) => {
          set((state) => {
            state.error = error;
          });
        },
        
        setLayout: (layout: ViewerState['layout']) => {
          set((state) => {
            state.layout = layout;
          });
          
          eventManager.emit('layout:changed', {
            layoutType: layout.type,
            viewportCount: layout.viewports.length,
            configuration: layout
          });
        },
        
        setActiveViewport: (viewportId: string | null) => {
          set((state) => {
            state.layout.activeViewportId = viewportId;
          });
        },
        
        updatePerformance: (viewportId: string, fps: number, renderTime: number) => {
          set((state) => {
            state.performance.fps[viewportId] = fps;
            if (!state.performance.renderTimes[viewportId]) {
              state.performance.renderTimes[viewportId] = [];
            }
            state.performance.renderTimes[viewportId].push(renderTime);
            // Keep only last 100 render times
            if (state.performance.renderTimes[viewportId].length > 100) {
              state.performance.renderTimes[viewportId].shift();
            }
          });
          
          eventManager.emit('performance:fps-updated', {
            viewportId,
            fps,
            timestamp: new Date()
          });
        },
        
        updateMemoryUsage: (usage: { heapUsed: number; heapTotal: number }) => {
          set((state) => {
            state.performance.memoryUsage = {
              ...usage,
              timestamp: new Date()
            };
          });
          
          eventManager.emit('performance:memory-usage', {
            ...usage,
            timestamp: new Date()
          });
        }
      }))
    ),
    { name: 'viewer-store' }
  ));

// ============================================================================
// IMAGE STORE - DICOM image management and caching
// ============================================================================

export interface ImageState {
  // Image cache and metadata
  images: Record<string, {
    id: string;
    metadata: DicomMetadata;
    loadState: 'idle' | 'loading' | 'loaded' | 'error';
    loadTime?: number;
    error?: string;
    cacheSize?: number;
  }>;
  
  // Loading state
  loadingImages: Set<string>;
  prefetchQueue: string[];
  
  // Cache management
  cacheStats: {
    totalSize: number;
    maxSize: number;
    hitRate: number;
    evictionCount: number;
  };
  
  // Actions
  loadImage: (imageId: string) => Promise<void>;
  setImageMetadata: (imageId: string, metadata: DicomMetadata) => void;
  setImageError: (imageId: string, error: string) => void;
  evictImage: (imageId: string, reason: string) => void;
  prefetchImages: (imageIds: string[]) => Promise<void>;
  updateCacheStats: (stats: Partial<ImageState['cacheStats']>) => void;
  clearCache: () => void;
}

export const useImageStore = create<ImageState>()()
  (devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        images: {},
        loadingImages: new Set(),
        prefetchQueue: [],
        cacheStats: {
          totalSize: 0,
          maxSize: 500 * 1024 * 1024, // 500MB default
          hitRate: 0,
          evictionCount: 0
        },
        
        // Actions
        loadImage: async (imageId: string) => {
          const state = get();
          if (state.loadingImages.has(imageId) || state.images[imageId]?.loadState === 'loaded') {
            return;
          }
          
          set((draft) => {
            draft.loadingImages.add(imageId);
            if (!draft.images[imageId]) {
              draft.images[imageId] = {
                id: imageId,
                metadata: {} as DicomMetadata,
                loadState: 'loading'
              };
            } else {
              draft.images[imageId].loadState = 'loading';
            }
          });
          
          await eventManager.emit('image:loading', { imageId });
          
          try {
            const startTime = Date.now();
            // Simulate image loading (replace with actual implementation)
            await new Promise(resolve => setTimeout(resolve, 100));
            const loadTime = Date.now() - startTime;
            
            // Mock metadata (replace with actual DICOM parsing)
            const metadata: DicomMetadata = {
              studyInstanceUID: `study_${imageId}`,
              seriesInstanceUID: `series_${imageId}`,
              sopInstanceUID: imageId,
              patientName: 'Test Patient',
              modality: 'CT'
            };
            
            set((draft) => {
              draft.loadingImages.delete(imageId);
              draft.images[imageId] = {
                id: imageId,
                metadata,
                loadState: 'loaded',
                loadTime
              };
            });
            
            await eventManager.emit('image:loaded', {
              imageId,
              metadata,
              loadTime
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            set((draft) => {
              draft.loadingImages.delete(imageId);
              if (draft.images[imageId]) {
                draft.images[imageId].loadState = 'error';
                draft.images[imageId].error = errorMessage;
              }
            });
            
            await eventManager.emit('image:error', {
              imageId,
              error: error as Error
            });
          }
        },
        
        setImageMetadata: (imageId: string, metadata: DicomMetadata) => {
          set((draft) => {
            if (draft.images[imageId]) {
              draft.images[imageId].metadata = metadata;
            }
          });
        },
        
        setImageError: (imageId: string, error: string) => {
          set((draft) => {
            if (draft.images[imageId]) {
              draft.images[imageId].loadState = 'error';
              draft.images[imageId].error = error;
            }
            draft.loadingImages.delete(imageId);
          });
        },
        
        evictImage: (imageId: string, reason: string) => {
          set((draft) => {
            delete draft.images[imageId];
            draft.cacheStats.evictionCount++;
          });
          
          eventManager.emit('image:evicted', { imageId, reason });
        },
        
        prefetchImages: async (imageIds: string[]) => {
          set((draft) => {
            draft.prefetchQueue = [...draft.prefetchQueue, ...imageIds];
          });
          
          await eventManager.emit('image:prefetch-started', { imageIds });
          
          let successCount = 0;
          let errorCount = 0;
          
          for (const imageId of imageIds) {
            try {
              await get().loadImage(imageId);
              successCount++;
            } catch {
              errorCount++;
            }
          }
          
          await eventManager.emit('image:prefetch-completed', {
            imageIds,
            successCount,
            errorCount
          });
        },
        
        updateCacheStats: (stats: Partial<ImageState['cacheStats']>) => {
          set((draft) => {
            Object.assign(draft.cacheStats, stats);
          });
        },
        
        clearCache: () => {
          set((draft) => {
            draft.images = {};
            draft.loadingImages.clear();
            draft.prefetchQueue = [];
            draft.cacheStats.totalSize = 0;
            draft.cacheStats.evictionCount = 0;
          });
        }
      }))
    ),
    { name: 'image-store' }
  ));

// ============================================================================
// TOOL STORE - Tool state and interaction management
// ============================================================================

export interface ToolState {
  // Active tools per viewport
  activeTools: Record<string, string>; // viewportId -> toolName
  
  // Tool configurations
  toolConfigs: Record<string, {
    name: string;
    state: ToolState;
    configuration: Record<string, any>;
    bindings: {
      mouse?: { button: number; modifiers?: string[] };
      keyboard?: { key: string; modifiers?: string[] };
    };
  }>;
  
  // Tool interactions
  activeInteractions: Record<string, {
    toolName: string;
    viewportId: string;
    startTime: number;
    data: any;
  }>;
  
  // Actions
  activateTool: (toolName: string, viewportId: string) => void;
  deactivateTool: (toolName: string, viewportId: string) => void;
  setToolState: (toolName: string, state: ToolState, viewportId?: string) => void;
  updateToolConfig: (toolName: string, config: any, viewportId?: string) => void;
  startInteraction: (toolName: string, viewportId: string, event: MouseEvent | TouchEvent) => void;
  endInteraction: (toolName: string, viewportId: string) => void;
  registerTool: (toolName: string, config: any) => void;
}

export const useToolStore = create<ToolState>()()
  (devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        activeTools: {},
        toolConfigs: {
          'window-level': {
            name: 'Window/Level',
            state: 'enabled',
            configuration: { sensitivity: 1.0 },
            bindings: { mouse: { button: 0 } }
          },
          'zoom': {
            name: 'Zoom',
            state: 'enabled',
            configuration: { sensitivity: 0.1 },
            bindings: { mouse: { button: 2 } }
          },
          'pan': {
            name: 'Pan',
            state: 'enabled',
            configuration: {},
            bindings: { mouse: { button: 1 } }
          }
        },
        activeInteractions: {},
        
        // Actions
        activateTool: (toolName: string, viewportId: string) => {
          const previousTool = get().activeTools[viewportId];
          
          set((draft) => {
            draft.activeTools[viewportId] = toolName;
            if (draft.toolConfigs[toolName]) {
              draft.toolConfigs[toolName].state = 'active';
            }
            if (previousTool && draft.toolConfigs[previousTool]) {
              draft.toolConfigs[previousTool].state = 'enabled';
            }
          });
          
          if (previousTool) {
            eventManager.emit('tool:deactivated', {
              toolName: previousTool,
              viewportId,
              previousState: 'active'
            });
          }
          
          eventManager.emit('tool:activated', {
            toolName,
            viewportId,
            toolState: 'active'
          });
        },
        
        deactivateTool: (toolName: string, viewportId: string) => {
          const currentTool = get().activeTools[viewportId];
          if (currentTool === toolName) {
            set((draft) => {
              delete draft.activeTools[viewportId];
              if (draft.toolConfigs[toolName]) {
                draft.toolConfigs[toolName].state = 'enabled';
              }
            });
            
            eventManager.emit('tool:deactivated', {
              toolName,
              viewportId,
              previousState: 'active'
            });
          }
        },
        
        setToolState: (toolName: string, state: ToolState, viewportId?: string) => {
          const oldState = get().toolConfigs[toolName]?.state;
          
          set((draft) => {
            if (draft.toolConfigs[toolName]) {
              draft.toolConfigs[toolName].state = state;
            }
          });
          
          if (oldState && oldState !== state) {
            eventManager.emit('tool:state-changed', {
              toolName,
              viewportId: viewportId || 'global',
              oldState,
              newState: state
            });
          }
        },
        
        updateToolConfig: (toolName: string, config: any, viewportId?: string) => {
          set((draft) => {
            if (draft.toolConfigs[toolName]) {
              Object.assign(draft.toolConfigs[toolName].configuration, config);
            }
          });
          
          eventManager.emit('tool:configuration-changed', {
            toolName,
            configuration: config,
            viewportId
          });
        },
        
        startInteraction: (toolName: string, viewportId: string, event: MouseEvent | TouchEvent) => {
          const interactionId = `${viewportId}_${toolName}`;
          
          set((draft) => {
            draft.activeInteractions[interactionId] = {
              toolName,
              viewportId,
              startTime: Date.now(),
              data: { event }
            };
          });
          
          eventManager.emit('tool:interaction-started', {
            toolName,
            viewportId,
            event
          });
        },
        
        endInteraction: (toolName: string, viewportId: string) => {
          const interactionId = `${viewportId}_${toolName}`;
          const interaction = get().activeInteractions[interactionId];
          
          if (interaction) {
            const duration = Date.now() - interaction.startTime;
            
            set((draft) => {
              delete draft.activeInteractions[interactionId];
            });
            
            eventManager.emit('tool:interaction-ended', {
              toolName,
              viewportId,
              duration
            });
          }
        },
        
        registerTool: (toolName: string, config: any) => {
          set((draft) => {
            draft.toolConfigs[toolName] = {
              name: config.displayName || toolName,
              state: 'enabled',
              configuration: config.defaultConfig || {},
              bindings: config.bindings || {}
            };
          });
        }
      }))
    ),
    { name: 'tool-store' }
  ));

// ============================================================================
// UI STORE - User interface state and preferences
// ============================================================================

export interface UIState {
  // Theme and appearance
  theme: 'light' | 'dark' | 'auto';
  
  // Panel visibility
  panels: {
    toolbar: boolean;
    sidebar: boolean;
    statusBar: boolean;
    thumbnails: boolean;
    annotations: boolean;
  };
  
  // Modal and overlay state
  modals: {
    settings: boolean;
    about: boolean;
    help: boolean;
    [key: string]: boolean;
  };
  
  // Loading states
  loading: {
    global: boolean;
    [key: string]: boolean;
  };
  
  // Notifications
  notifications: Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: Date;
    duration?: number;
    actions?: Array<{ label: string; action: () => void }>;
  }>;
  
  // Actions
  setTheme: (theme: UIState['theme']) => void;
  togglePanel: (panel: keyof UIState['panels']) => void;
  showModal: (modal: string) => void;
  hideModal: (modal: string) => void;
  setLoading: (key: string, loading: boolean) => void;
  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useUIStore = create<UIState>()()
  (devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          // Initial state
          theme: 'dark',
          panels: {
            toolbar: true,
            sidebar: true,
            statusBar: true,
            thumbnails: false,
            annotations: true
          },
          modals: {
            settings: false,
            about: false,
            help: false
          },
          loading: {
            global: false
          },
          notifications: [],
          
          // Actions
          setTheme: (theme: UIState['theme']) => {
            set((draft) => {
              draft.theme = theme;
            });
          },
          
          togglePanel: (panel: keyof UIState['panels']) => {
            set((draft) => {
              draft.panels[panel] = !draft.panels[panel];
            });
          },
          
          showModal: (modal: string) => {
            set((draft) => {
              draft.modals[modal] = true;
            });
          },
          
          hideModal: (modal: string) => {
            set((draft) => {
              draft.modals[modal] = false;
            });
          },
          
          setLoading: (key: string, loading: boolean) => {
            set((draft) => {
              draft.loading[key] = loading;
            });
          },
          
          addNotification: (notification) => {
            const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            set((draft) => {
              draft.notifications.push({
                ...notification,
                id,
                timestamp: new Date()
              });
            });
            
            // Auto-remove notification after duration
            if (notification.duration) {
              setTimeout(() => {
                get().removeNotification(id);
              }, notification.duration);
            }
            
            return id;
          },
          
          removeNotification: (id: string) => {
            set((draft) => {
              const index = draft.notifications.findIndex(n => n.id === id);
              if (index !== -1) {
                draft.notifications.splice(index, 1);
              }
            });
          },
          
          clearNotifications: () => {
            set((draft) => {
              draft.notifications = [];
            });
          }
        }))
      ),
      {
        name: 'ui-store',
        partialize: (state) => ({
          theme: state.theme,
          panels: state.panels
        })
      }
    ),
    { name: 'ui-store' }
  ));

// ============================================================================
// SETTINGS STORE - Application configuration and user preferences
// ============================================================================

export interface SettingsState {
  // Viewer preferences
  viewer: {
    defaultLayout: string;
    enableHardwareAcceleration: boolean;
    maxCacheSize: number;
    prefetchCount: number;
    enablePrefetch: boolean;
  };
  
  // Display settings
  display: {
    interpolation: 'nearest' | 'linear';
    defaultWindowLevel: { center: number; width: number } | null;
    invertColors: boolean;
    enableSmoothing: boolean;
    pixelSpacing: 'auto' | 'manual';
  };
  
  // Tool preferences
  tools: {
    defaultTool: string;
    enableTooltips: boolean;
    toolSensitivity: Record<string, number>;
    enableGestures: boolean;
  };
  
  // Performance settings
  performance: {
    enableWebGL: boolean;
    maxTextureSize: number;
    enableMultiThreading: boolean;
    renderingQuality: 'low' | 'medium' | 'high';
  };
  
  // Accessibility
  accessibility: {
    enableHighContrast: boolean;
    fontSize: 'small' | 'medium' | 'large';
    enableScreenReader: boolean;
    keyboardNavigation: boolean;
  };
  
  // Actions
  updateViewerSettings: (settings: Partial<SettingsState['viewer']>) => void;
  updateDisplaySettings: (settings: Partial<SettingsState['display']>) => void;
  updateToolSettings: (settings: Partial<SettingsState['tools']>) => void;
  updatePerformanceSettings: (settings: Partial<SettingsState['performance']>) => void;
  updateAccessibilitySettings: (settings: Partial<SettingsState['accessibility']>) => void;
  resetToDefaults: () => void;
  exportSettings: () => string;
  importSettings: (settings: string) => void;
}

const defaultSettings: Omit<SettingsState, 'updateViewerSettings' | 'updateDisplaySettings' | 'updateToolSettings' | 'updatePerformanceSettings' | 'updateAccessibilitySettings' | 'resetToDefaults' | 'exportSettings' | 'importSettings'> = {
  viewer: {
    defaultLayout: '1x1',
    enableHardwareAcceleration: true,
    maxCacheSize: 500 * 1024 * 1024, // 500MB
    prefetchCount: 5,
    enablePrefetch: true
  },
  display: {
    interpolation: 'linear',
    defaultWindowLevel: null,
    invertColors: false,
    enableSmoothing: true,
    pixelSpacing: 'auto'
  },
  tools: {
    defaultTool: 'window-level',
    enableTooltips: true,
    toolSensitivity: {
      'window-level': 1.0,
      'zoom': 0.1,
      'pan': 1.0
    },
    enableGestures: true
  },
  performance: {
    enableWebGL: true,
    maxTextureSize: 4096,
    enableMultiThreading: true,
    renderingQuality: 'high'
  },
  accessibility: {
    enableHighContrast: false,
    fontSize: 'medium',
    enableScreenReader: false,
    keyboardNavigation: true
  }
};

export const useSettingsStore = create<SettingsState>()()
  (devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...defaultSettings,
          
          // Actions
          updateViewerSettings: (settings: Partial<SettingsState['viewer']>) => {
            set((draft) => {
              Object.assign(draft.viewer, settings);
            });
            
            eventManager.emit('config:changed', {
              section: 'viewer',
              oldValue: get().viewer,
              newValue: { ...get().viewer, ...settings },
              source: 'user'
            });
          },
          
          updateDisplaySettings: (settings: Partial<SettingsState['display']>) => {
            set((draft) => {
              Object.assign(draft.display, settings);
            });
            
            eventManager.emit('config:changed', {
              section: 'display',
              oldValue: get().display,
              newValue: { ...get().display, ...settings },
              source: 'user'
            });
          },
          
          updateToolSettings: (settings: Partial<SettingsState['tools']>) => {
            set((draft) => {
              Object.assign(draft.tools, settings);
            });
            
            eventManager.emit('config:changed', {
              section: 'tools',
              oldValue: get().tools,
              newValue: { ...get().tools, ...settings },
              source: 'user'
            });
          },
          
          updatePerformanceSettings: (settings: Partial<SettingsState['performance']>) => {
            set((draft) => {
              Object.assign(draft.performance, settings);
            });
            
            eventManager.emit('config:changed', {
              section: 'performance',
              oldValue: get().performance,
              newValue: { ...get().performance, ...settings },
              source: 'user'
            });
          },
          
          updateAccessibilitySettings: (settings: Partial<SettingsState['accessibility']>) => {
            set((draft) => {
              Object.assign(draft.accessibility, settings);
            });
            
            eventManager.emit('config:changed', {
              section: 'accessibility',
              oldValue: get().accessibility,
              newValue: { ...get().accessibility, ...settings },
              source: 'user'
            });
          },
          
          resetToDefaults: () => {
            set((draft) => {
              Object.assign(draft, defaultSettings);
            });
            
            eventManager.emit('config:reset', {
              timestamp: new Date()
            });
          },
          
          exportSettings: () => {
            const state = get();
            return JSON.stringify({
              viewer: state.viewer,
              display: state.display,
              tools: state.tools,
              performance: state.performance,
              accessibility: state.accessibility
            }, null, 2);
          },
          
          importSettings: (settingsJson: string) => {
            try {
              const settings = JSON.parse(settingsJson);
              set((draft) => {
                if (settings.viewer) Object.assign(draft.viewer, settings.viewer);
                if (settings.display) Object.assign(draft.display, settings.display);
                if (settings.tools) Object.assign(draft.tools, settings.tools);
                if (settings.performance) Object.assign(draft.performance, settings.performance);
                if (settings.accessibility) Object.assign(draft.accessibility, settings.accessibility);
              });
            } catch (error) {
              console.error('Failed to import settings:', error);
              throw new Error('Invalid settings format');
            }
          }
        }))
      ),
      {
        name: 'settings-store',
        version: 1
      }
    ),
    { name: 'settings-store' }
  ));

// ============================================================================
// STORE UTILITIES AND CROSS-STORE COMMUNICATION
// ============================================================================

/**
 * Reset all stores to their initial state
 */
export const resetAllStores = () => {
  useViewerStore.getState().shutdown();
  useImageStore.getState().clearCache();
  useUIStore.getState().clearNotifications();
  useSettingsStore.getState().resetToDefaults();
};

/**
 * Get combined store state for debugging
 */
export const getStoreSnapshot = () => ({
  viewer: useViewerStore.getState(),
  image: useImageStore.getState(),
  tool: useToolStore.getState(),
  ui: useUIStore.getState(),
  settings: useSettingsStore.getState()
});

/**
 * Subscribe to cross-store events
 */
export const setupStoreEventListeners = () => {
  // Listen for system errors and show notifications
  eventManager.on('system:error', (data) => {
    useUIStore.getState().addNotification({
      type: 'error',
      title: 'System Error',
      message: data.error.message,
      duration: 5000
    });
  });
  
  // Listen for image load errors and show notifications
  eventManager.on('image:error', (data) => {
    useUIStore.getState().addNotification({
      type: 'error',
      title: 'Image Load Error',
      message: `Failed to load image: ${data.imageId}`,
      duration: 3000
    });
  });
  
  // Listen for performance warnings
  eventManager.on('performance:memory-usage', (data) => {
    const memoryMB = data.heapUsed / 1024 / 1024;
    if (memoryMB > 200) { // 200MB threshold
      useUIStore.getState().addNotification({
        type: 'warning',
        title: 'High Memory Usage',
        message: `Memory usage: ${Math.round(memoryMB)}MB`,
        duration: 5000
      });
    }
  });
};