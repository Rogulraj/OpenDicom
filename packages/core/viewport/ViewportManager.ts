import create from 'zustand';
import { ViewportType, Viewport, ViewportLayout, SyncGroup } from '../types/viewport';

interface ViewportState {
  viewports: Map<string, Viewport>;
  activeViewportId: string | null;
  layout: ViewportLayout;
  syncGroups: Map<string, SyncGroup>;
  setActiveViewport: (id: string) => void;
  addViewport: (viewport: Viewport) => void;
  removeViewport: (id: string) => void;
  updateLayout: (layout: ViewportLayout) => void;
  syncViewports: (groupId: string, viewportIds: string[]) => void;
}

const useViewportStore = create<ViewportState>((set) => ({
  viewports: new Map(),
  activeViewportId: null,
  layout: { rows: 1, cols: 1 },
  syncGroups: new Map(),

  setActiveViewport: (id) => 
    set((state) => ({ activeViewportId: id })),

  addViewport: (viewport) =>
    set((state) => {
      const newViewports = new Map(state.viewports);
      newViewports.set(viewport.id, viewport);
      return { viewports: newViewports };
    }),

  removeViewport: (id) =>
    set((state) => {
      const newViewports = new Map(state.viewports);
      newViewports.delete(id);
      return { viewports: newViewports };
    }),

  updateLayout: (layout) =>
    set((state) => ({ layout })),

  syncViewports: (groupId, viewportIds) =>
    set((state) => {
      const newSyncGroups = new Map(state.syncGroups);
      newSyncGroups.set(groupId, { id: groupId, viewportIds });
      return { syncGroups: newSyncGroups };
    }),
}));

export class ViewportManager {
  private static instance: ViewportManager;
  private store = useViewportStore;

  private constructor() {}

  static getInstance(): ViewportManager {
    if (!ViewportManager.instance) {
      ViewportManager.instance = new ViewportManager();
    }
    return ViewportManager.instance;
  }

  getActiveViewport(): Viewport | null {
    const state = this.store.getState();
    return state.activeViewportId 
      ? state.viewports.get(state.activeViewportId) || null 
      : null;
  }

  createViewport(type: ViewportType, options: any = {}): string {
    const viewport: Viewport = {
      id: `viewport-${Date.now()}`,
      type,
      options,
      element: null,
    };
    this.store.getState().addViewport(viewport);
    return viewport.id;
  }

  destroyViewport(id: string): void {
    this.store.getState().removeViewport(id);
  }

  setViewportLayout(rows: number, cols: number): void {
    this.store.getState().updateLayout({ rows, cols });
  }

  createSyncGroup(groupId: string, viewportIds: string[]): void {
    this.store.getState().syncViewports(groupId, viewportIds);
  }

  subscribe(callback: (state: ViewportState) => void): () => void {
    return this.store.subscribe(callback);
  }
}

export { useViewportStore };