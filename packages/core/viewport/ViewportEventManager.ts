import { ViewportManager } from './ViewportManager';
import { EventEmitter } from '../events/EventEmitter';
import { ViewportType } from '../types/viewport';

export interface ViewportEvent {
  viewportId: string;
  type: string;
  data: any;
}

export class ViewportEventManager extends EventEmitter {
  private static instance: ViewportEventManager;
  private viewportManager: ViewportManager;

  private constructor() {
    super();
    this.viewportManager = ViewportManager.getInstance();
    this.setupEventHandlers();
  }

  static getInstance(): ViewportEventManager {
    if (!ViewportEventManager.instance) {
      ViewportEventManager.instance = new ViewportEventManager();
    }
    return ViewportEventManager.instance;
  }

  private setupEventHandlers(): void {
    // Subscribe to viewport store changes
    this.viewportManager.subscribe((state) => {
      // Handle viewport addition/removal
      state.viewports.forEach((viewport, id) => {
        if (viewport.type === ViewportType.STACK) {
          this.setupStackViewportEvents(id);
        } else if (viewport.type === ViewportType.VOLUME) {
          this.setupVolumeViewportEvents(id);
        }
      });

      // Handle sync group changes
      state.syncGroups.forEach((group) => {
        this.setupSyncGroupEvents(group.id, group.viewportIds);
      });
    });
  }

  private setupStackViewportEvents(viewportId: string): void {
    const viewport = this.viewportManager.getViewport(viewportId);
    if (!viewport) return;

    // Stack-specific events
    viewport.on('stackScroll', (data) => {
      this.emit('viewportEvent', {
        viewportId,
        type: 'stackScroll',
        data
      });

      // Synchronize with other viewports in the same group
      this.synchronizeEvent(viewportId, 'stackScroll', data);
    });

    viewport.on('windowLevel', (data) => {
      this.emit('viewportEvent', {
        viewportId,
        type: 'windowLevel',
        data
      });

      this.synchronizeEvent(viewportId, 'windowLevel', data);
    });
  }

  private setupVolumeViewportEvents(viewportId: string): void {
    const viewport = this.viewportManager.getViewport(viewportId);
    if (!viewport) return;

    // Volume-specific events
    viewport.on('orientationChange', (data) => {
      this.emit('viewportEvent', {
        viewportId,
        type: 'orientationChange',
        data
      });

      this.synchronizeEvent(viewportId, 'orientationChange', data);
    });

    viewport.on('renderingModeChange', (data) => {
      this.emit('viewportEvent', {
        viewportId,
        type: 'renderingModeChange',
        data
      });

      this.synchronizeEvent(viewportId, 'renderingModeChange', data);
    });
  }

  private setupSyncGroupEvents(groupId: string, viewportIds: string[]): void {
    // Create a mapping of synchronized events for the group
    const syncEvents = new Map<string, Set<string>>();

    viewportIds.forEach(viewportId => {
      const viewport = this.viewportManager.getViewport(viewportId);
      if (!viewport) return;

      // Define which events should be synchronized based on viewport type
      if (viewport.type === ViewportType.STACK) {
        this.addSyncEvent(syncEvents, 'stackScroll', viewportId);
        this.addSyncEvent(syncEvents, 'windowLevel', viewportId);
      } else if (viewport.type === ViewportType.VOLUME) {
        this.addSyncEvent(syncEvents, 'orientationChange', viewportId);
        this.addSyncEvent(syncEvents, 'renderingModeChange', viewportId);
      }
    });

    // Store sync events configuration
    this.emit('syncGroupConfigured', {
      groupId,
      viewportIds,
      syncEvents: Array.from(syncEvents.entries())
    });
  }

  private addSyncEvent(
    syncEvents: Map<string, Set<string>>,
    eventType: string,
    viewportId: string
  ): void {
    if (!syncEvents.has(eventType)) {
      syncEvents.set(eventType, new Set());
    }
    syncEvents.get(eventType)!.add(viewportId);
  }

  private synchronizeEvent(
    sourceViewportId: string,
    eventType: string,
    eventData: any
  ): void {
    const state = this.viewportManager.getState();
    
    // Find sync groups containing the source viewport
    state.syncGroups.forEach((group) => {
      if (group.viewportIds.includes(sourceViewportId)) {
        // Synchronize event to other viewports in the group
        group.viewportIds.forEach((targetViewportId) => {
          if (targetViewportId !== sourceViewportId) {
            const targetViewport = this.viewportManager.getViewport(targetViewportId);
            if (targetViewport) {
              // Apply synchronized changes
              switch (eventType) {
                case 'stackScroll':
                  targetViewport.setOptions({ currentImageIndex: eventData.imageIndex });
                  break;
                case 'windowLevel':
                  targetViewport.setOptions({
                    windowWidth: eventData.windowWidth,
                    windowCenter: eventData.windowCenter
                  });
                  break;
                case 'orientationChange':
                  targetViewport.setOptions({ orientation: eventData.orientation });
                  break;
                case 'renderingModeChange':
                  targetViewport.setOptions({ renderingMode: eventData.mode });
                  break;
              }
            }
          }
        });
      }
    });
  }

  // Public API for manual event triggering
  triggerViewportEvent(event: ViewportEvent): void {
    const viewport = this.viewportManager.getViewport(event.viewportId);
    if (viewport) {
      viewport.emit(event.type, event.data);
    }
  }

  // Clean up event listeners
  destroy(): void {
    this.removeAllListeners();
  }
}