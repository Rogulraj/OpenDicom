import { EventEmitter } from '../events/EventEmitter';
import { ViewportManager } from './ViewportManager';
import { Viewport, SyncGroup } from '../types/viewport';

export interface ViewportSyncState {
  pan: { x: number; y: number };
  zoom: number;
  windowLevel: { window: number; level: number };
  rotation: number;
  flip: { horizontal: boolean; vertical: boolean };
}

export interface SyncOperation {
  type: 'pan' | 'zoom' | 'windowLevel' | 'rotation' | 'flip';
  value: any;
  sourceViewportId: string;
  syncGroupId: string;
}

export class ViewportSyncManager extends EventEmitter {
  private viewportManager: ViewportManager;
  private syncGroups: Map<string, SyncGroup> = new Map();
  private viewportStates: Map<string, ViewportSyncState> = new Map();

  constructor(viewportManager: ViewportManager) {
    super();
    this.viewportManager = viewportManager;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.viewportManager.on('viewportCreated', this.handleViewportCreated);
    this.viewportManager.on('viewportDestroyed', this.handleViewportDestroyed);
    this.viewportManager.on('syncGroupCreated', this.handleSyncGroupCreated);
    this.viewportManager.on('syncGroupDestroyed', this.handleSyncGroupDestroyed);
  }

  private handleViewportCreated = (viewport: Viewport) => {
    this.viewportStates.set(viewport.id, {
      pan: { x: 0, y: 0 },
      zoom: 1,
      windowLevel: { window: 255, level: 127 },
      rotation: 0,
      flip: { horizontal: false, vertical: false }
    });
  };

  private handleViewportDestroyed = (viewportId: string) => {
    this.viewportStates.delete(viewportId);
  };

  private handleSyncGroupCreated = (syncGroup: SyncGroup) => {
    this.syncGroups.set(syncGroup.id, syncGroup);
  };

  private handleSyncGroupDestroyed = (syncGroupId: string) => {
    this.syncGroups.delete(syncGroupId);
  };

  public synchronizeViewports(operation: SyncOperation): void {
    const syncGroup = this.syncGroups.get(operation.syncGroupId);
    if (!syncGroup) return;

    const viewportsToSync = syncGroup.viewportIds.filter(id => id !== operation.sourceViewportId);
    
    viewportsToSync.forEach(viewportId => {
      const viewport = this.viewportManager.getViewport(viewportId);
      if (!viewport) return;

      const currentState = this.viewportStates.get(viewportId);
      if (!currentState) return;

      let newState: Partial<ViewportSyncState>;

      switch (operation.type) {
        case 'pan':
          newState = {
            pan: operation.value
          };
          break;
        case 'zoom':
          newState = {
            zoom: operation.value
          };
          break;
        case 'windowLevel':
          newState = {
            windowLevel: operation.value
          };
          break;
        case 'rotation':
          newState = {
            rotation: operation.value
          };
          break;
        case 'flip':
          newState = {
            flip: operation.value
          };
          break;
      }

      this.viewportStates.set(viewportId, { ...currentState, ...newState });
      this.emit('viewportStateUpdated', { viewportId, state: newState });
    });
  }

  public getViewportState(viewportId: string): ViewportSyncState | undefined {
    return this.viewportStates.get(viewportId);
  }

  public updateViewportState(viewportId: string, updates: Partial<ViewportSyncState>): void {
    const currentState = this.viewportStates.get(viewportId);
    if (!currentState) return;

    const newState = { ...currentState, ...updates };
    this.viewportStates.set(viewportId, newState);

    const viewport = this.viewportManager.getViewport(viewportId);
    if (!viewport?.syncGroupId) return;

    Object.keys(updates).forEach(key => {
      const type = key as keyof ViewportSyncState;
      this.synchronizeViewports({
        type: type as any,
        value: updates[type],
        sourceViewportId: viewportId,
        syncGroupId: viewport.syncGroupId
      });
    });
  }

  public destroy(): void {
    this.viewportManager.off('viewportCreated', this.handleViewportCreated);
    this.viewportManager.off('viewportDestroyed', this.handleViewportDestroyed);
    this.viewportManager.off('syncGroupCreated', this.handleSyncGroupCreated);
    this.viewportManager.off('syncGroupDestroyed', this.handleSyncGroupDestroyed);
    this.removeAllListeners();
  }
}