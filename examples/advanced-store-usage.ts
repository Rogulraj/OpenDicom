/**
 * Advanced Store Usage Example
 * Demonstrates the new event system and Zustand store architecture
 */

import {
  // Core stores
  useViewerStore,
  useImageStore,
  useToolStore,
  useUIStore,
  useSettingsStore,
  
  // Store orchestrator
  StoreOrchestrator,
  
  // Dev tools
  createAsyncAction,
  createBatchAction,
  initializeDevTools,
  useDevTools,
  storePerformanceMonitor,
  storeDebugger
} from '@opendicom/core';

import { eventManager } from '@opendicom/events';
import type { ViewerEvents } from '@opendicom/events';

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the application with stores and dev tools
 */
export async function initializeApplication() {
  // Initialize dev tools in development
  if (process.env.NODE_ENV === 'development') {
    initializeDevTools({
      enablePerformanceMonitoring: true,
      enableDebugLogging: true,
      logLevel: 'debug'
    });
  }
  
  // Create store orchestrator
  const orchestrator = new StoreOrchestrator();
  await orchestrator.initialize();
  
  // Set up global error handling
  eventManager.on('error', (error) => {
    console.error('Application error:', error);
    useUIStore.getState().addNotification({
      type: 'error',
      title: 'Application Error',
      message: error.message,
      duration: 5000
    });
  });
  
  return orchestrator;
}

// ============================================================================
// ASYNC ACTIONS WITH LOADING STATES
// ============================================================================

/**
 * Load DICOM image with proper loading states and error handling
 */
export const loadDicomImage = createAsyncAction(
  'loadDicomImage',
  async (file: File) => {
    // Simulate DICOM loading
    const arrayBuffer = await file.arrayBuffer();
    
    // Parse DICOM data (simplified)
    const imageData = {
      id: `image-${Date.now()}`,
      filename: file.name,
      size: file.size,
      modality: 'CT', // Would be parsed from DICOM
      studyDate: new Date().toISOString(),
      patientName: 'Anonymous',
      dimensions: { width: 512, height: 512, frames: 1 },
      pixelData: new Uint16Array(arrayBuffer.slice(0, 512 * 512 * 2))
    };
    
    // Add to image store
    useImageStore.getState().addImage(imageData);
    
    // Set as current image
    useViewerStore.getState().setCurrentImageId(imageData.id);
    
    // Emit event
    await eventManager.emit('image:loaded', {
      imageId: imageData.id,
      metadata: {
        modality: imageData.modality,
        studyDate: imageData.studyDate,
        patientName: imageData.patientName,
        dimensions: imageData.dimensions
      }
    });
    
    return imageData;
  },
  {
    loadingKey: 'loadingImage',
    successMessage: 'DICOM image loaded successfully',
    errorMessage: 'Failed to load DICOM image',
    retries: 2,
    timeout: 30000
  }
);

/**
 * Batch load multiple DICOM files
 */
export const loadMultipleDicomImages = (files: File[]) => {
  return createBatchAction(
    'loadMultipleDicomImages',
    files,
    async (file, index) => {
      await loadDicomImage(file);
    },
    {
      concurrency: 3,
      failFast: false,
      progressCallback: (completed, total) => {
        useUIStore.getState().setProgress('batchLoad', completed / total);
      }
    }
  )();
};

// ============================================================================
// EVENT-DRIVEN INTERACTIONS
// ============================================================================

/**
 * Set up event listeners for cross-component communication
 */
export function setupEventListeners() {
  // Listen for viewport changes
  eventManager.on('viewport:changed', async (data) => {
    const { viewportId, camera } = data;
    
    // Update viewer state
    useViewerStore.getState().updateViewport(viewportId, {
      camera,
      lastUpdated: Date.now()
    });
    
    // Save to settings for persistence
    const settings = useSettingsStore.getState();
    settings.updateViewerSettings({
      defaultCamera: camera
    });
  });
  
  // Listen for tool changes
  eventManager.on('tool:activated', async (data) => {
    const { toolName, toolData } = data;
    
    // Update tool store
    useToolStore.getState().setActiveTool(toolName);
    
    // Update UI state
    useUIStore.getState().setActivePanel('tools');
    
    // Show tool-specific UI
    if (toolName === 'measurement') {
      useUIStore.getState().showModal('measurementSettings');
    }
  });
  
  // Listen for annotation events
  eventManager.on('annotation:created', async (data) => {
    const { annotation } = data;
    
    // Add to image store
    const imageStore = useImageStore.getState();
    const currentImage = imageStore.getCurrentImage();
    
    if (currentImage) {
      imageStore.addAnnotation(currentImage.id, annotation);
    }
    
    // Show success notification
    useUIStore.getState().addNotification({
      type: 'success',
      title: 'Annotation Created',
      message: `${annotation.type} annotation added`,
      duration: 3000
    });
  });
  
  // Listen for performance warnings
  eventManager.on('performance:warning', async (data) => {
    const { metric, threshold, actual } = data;
    
    console.warn(`Performance warning: ${metric} (${actual}ms) exceeded threshold (${threshold}ms)`);
    
    // Show warning in development
    if (process.env.NODE_ENV === 'development') {
      useUIStore.getState().addNotification({
        type: 'warning',
        title: 'Performance Warning',
        message: `${metric} is running slowly (${actual}ms)`,
        duration: 5000
      });
    }
  });
}

// ============================================================================
// STORE INTERACTIONS
// ============================================================================

/**
 * Example of complex store interactions
 */
export class DicomViewerController {
  private orchestrator: StoreOrchestrator;
  
  constructor(orchestrator: StoreOrchestrator) {
    this.orchestrator = orchestrator;
  }
  
  /**
   * Load and display a DICOM study
   */
  async loadStudy(files: File[]) {
    try {
      // Show loading state
      useUIStore.getState().setLoading('loadingStudy', true);
      
      // Load all images
      const results = await loadMultipleDicomImages(files);
      
      // Group images by series
      const imageStore = useImageStore.getState();
      const images = imageStore.getAllImages();
      
      // Set up viewer for first image
      if (images.length > 0) {
        const firstImage = images[0];
        useViewerStore.getState().setCurrentImageId(firstImage.id);
        
        // Configure viewport
        useViewerStore.getState().updateViewport('main', {
          camera: {
            position: { x: 0, y: 0, z: 0 },
            target: { x: 0, y: 0, z: 0 },
            up: { x: 0, y: 1, z: 0 },
            zoom: 1
          },
          lastUpdated: Date.now()
        });
        
        // Emit study loaded event
        await eventManager.emit('study:loaded', {
          studyId: `study-${Date.now()}`,
          imageCount: images.length,
          modality: firstImage.modality
        });
      }
      
      return results;
    } finally {
      useUIStore.getState().setLoading('loadingStudy', false);
    }
  }
  
  /**
   * Apply window/level settings
   */
  async applyWindowLevel(windowWidth: number, windowCenter: number) {
    const viewerStore = useViewerStore.getState();
    const currentImageId = viewerStore.currentImageId;
    
    if (!currentImageId) return;
    
    // Update viewer settings
    viewerStore.updateViewport('main', {
      windowWidth,
      windowCenter,
      lastUpdated: Date.now()
    });
    
    // Emit event
    await eventManager.emit('viewport:window-level-changed', {
      viewportId: 'main',
      windowWidth,
      windowCenter
    });
    
    // Save to user preferences
    const settings = useSettingsStore.getState();
    settings.updateViewerSettings({
      defaultWindowWidth: windowWidth,
      defaultWindowCenter: windowCenter
    });
  }
  
  /**
   * Create measurement annotation
   */
  async createMeasurement(startPoint: { x: number; y: number }, endPoint: { x: number; y: number }) {
    const viewerStore = useViewerStore.getState();
    const currentImageId = viewerStore.currentImageId;
    
    if (!currentImageId) return;
    
    // Calculate distance
    const distance = Math.sqrt(
      Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2)
    );
    
    const annotation = {
      id: `measurement-${Date.now()}`,
      type: 'measurement' as const,
      points: [startPoint, endPoint],
      data: {
        distance: distance.toFixed(2),
        unit: 'mm'
      },
      createdAt: Date.now()
    };
    
    // Add to store
    useImageStore.getState().addAnnotation(currentImageId, annotation);
    
    // Emit event
    await eventManager.emit('annotation:created', {
      annotation,
      imageId: currentImageId
    });
    
    return annotation;
  }
  
  /**
   * Export current state for debugging
   */
  exportDebugInfo() {
    return {
      stores: {
        viewer: useViewerStore.getState(),
        image: useImageStore.getState(),
        tool: useToolStore.getState(),
        ui: useUIStore.getState(),
        settings: useSettingsStore.getState()
      },
      performance: storePerformanceMonitor.getMetrics(),
      actionHistory: storeDebugger.getActionHistory(),
      eventHistory: eventManager.getEventHistory()
    };
  }
}

// ============================================================================
// REACT HOOKS FOR COMPONENTS
// ============================================================================

/**
 * Custom hook for DICOM viewer functionality
 */
export function useDicomViewer() {
  const viewerStore = useViewerStore();
  const imageStore = useImageStore();
  const toolStore = useToolStore();
  const uiStore = useUIStore();
  const devTools = useDevTools();
  
  return {
    // State
    currentImage: imageStore.getCurrentImage(),
    currentTool: toolStore.activeTool,
    isLoading: uiStore.loading.loadingImage || uiStore.loading.loadingStudy,
    notifications: uiStore.notifications,
    
    // Actions
    loadImage: loadDicomImage,
    loadMultipleImages: loadMultipleDicomImages,
    setTool: toolStore.setActiveTool,
    addNotification: uiStore.addNotification,
    
    // Dev tools (development only)
    ...(process.env.NODE_ENV === 'development' && {
      debugInfo: devTools.exportDebugData,
      performanceMetrics: devTools.getPerformanceMetrics,
      createAsyncAction: devTools.createAsyncAction,
      createBatchAction: devTools.createBatchAction
    })
  };
}

/**
 * Custom hook for event management
 */
export function useEventManager() {
  return {
    emit: eventManager.emit.bind(eventManager),
    on: eventManager.on.bind(eventManager),
    off: eventManager.off.bind(eventManager),
    once: eventManager.once.bind(eventManager),
    getHistory: eventManager.getEventHistory.bind(eventManager),
    clearHistory: eventManager.clearEventHistory.bind(eventManager)
  };
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/**
 * Example of how to use the new architecture in a React component
 */
/*
import React, { useEffect } from 'react';
import { useDicomViewer, useEventManager, setupEventListeners } from './advanced-store-usage';

export function DicomViewerComponent() {
  const {
    currentImage,
    currentTool,
    isLoading,
    notifications,
    loadImage,
    setTool,
    addNotification
  } = useDicomViewer();
  
  const eventManager = useEventManager();
  
  useEffect(() => {
    // Set up event listeners
    setupEventListeners();
    
    // Listen for custom events
    const unsubscribe = eventManager.on('image:loaded', (data) => {
      addNotification({
        type: 'success',
        title: 'Image Loaded',
        message: `Loaded ${data.metadata.modality} image`,
        duration: 3000
      });
    });
    
    return unsubscribe;
  }, []);
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      try {
        await loadImage(files[0]);
      } catch (error) {
        console.error('Failed to load image:', error);
      }
    }
  };
  
  return (
    <div className="dicom-viewer">
      <div className="toolbar">
        <input type="file" accept=".dcm" onChange={handleFileUpload} />
        <button onClick={() => setTool('pan')}>Pan</button>
        <button onClick={() => setTool('zoom')}>Zoom</button>
        <button onClick={() => setTool('measurement')}>Measure</button>
      </div>
      
      <div className="viewport">
        {isLoading && <div className="loading">Loading...</div>}
        {currentImage && (
          <div className="image-info">
            <p>Patient: {currentImage.patientName}</p>
            <p>Modality: {currentImage.modality}</p>
            <p>Dimensions: {currentImage.dimensions.width}x{currentImage.dimensions.height}</p>
          </div>
        )}
      </div>
      
      <div className="notifications">
        {notifications.map(notification => (
          <div key={notification.id} className={`notification ${notification.type}`}>
            <h4>{notification.title}</h4>
            <p>{notification.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
*/