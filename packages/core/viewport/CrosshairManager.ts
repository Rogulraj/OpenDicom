import { EventEmitter } from '../events/EventEmitter';
import { ViewportManager } from './ViewportManager';
import { ViewportSyncManager } from './ViewportSyncManager';
import { Viewport } from '../types/viewport';

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface CrosshairPoint {
  worldPosition: Point3D;
  viewportPositions: Map<string, { x: number; y: number }>;
}

interface CrosshairState {
  isActive: boolean;
  currentPoint: CrosshairPoint | null;
  referenceViewportId: string | null;
}

export class CrosshairManager extends EventEmitter {
  private viewportManager: ViewportManager;
  private syncManager: ViewportSyncManager;
  private state: CrosshairState;
  private imageToWorldMatrices: Map<string, number[]> = new Map();
  private worldToImageMatrices: Map<string, number[]> = new Map();

  constructor(viewportManager: ViewportManager, syncManager: ViewportSyncManager) {
    super();
    this.viewportManager = viewportManager;
    this.syncManager = syncManager;
    this.state = {
      isActive: false,
      currentPoint: null,
      referenceViewportId: null
    };
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.viewportManager.on('viewportCreated', this.handleViewportCreated);
    this.viewportManager.on('viewportDestroyed', this.handleViewportDestroyed);
    this.viewportManager.on('viewportUpdated', this.handleViewportUpdated);
  }

  private handleViewportCreated = (viewport: Viewport): void => {
    if (viewport.type === 'volume') {
      this.updateViewportTransformMatrix(viewport);
    }
  };

  private handleViewportDestroyed = (viewportId: string): void => {
    this.imageToWorldMatrices.delete(viewportId);
    this.worldToImageMatrices.delete(viewportId);
    
    if (this.state.referenceViewportId === viewportId) {
      this.state.referenceViewportId = null;
      this.state.currentPoint = null;
    }
  };

  private handleViewportUpdated = (viewport: Viewport): void => {
    if (viewport.type === 'volume') {
      this.updateViewportTransformMatrix(viewport);
      this.updateCrosshairPositions();
    }
  };

  private updateViewportTransformMatrix(viewport: Viewport): void {
    // Calculate transformation matrices based on viewport orientation and position
    const { imageToWorld, worldToImage } = this.calculateTransformationMatrices(viewport);
    this.imageToWorldMatrices.set(viewport.id, imageToWorld);
    this.worldToImageMatrices.set(viewport.id, worldToImage);
  }

  private calculateTransformationMatrices(viewport: Viewport): {
    imageToWorld: number[];
    worldToImage: number[];
  } {
    // This is a simplified calculation - in reality, we'd use the actual
    // image orientation patient (IOP) and image position patient (IPP)
    const orientation = viewport.options?.orientation || { x: 0, y: 0, z: 1 };
    const position = viewport.options?.position || { x: 0, y: 0, z: 0 };
    
    // Create 4x4 transformation matrix
    const matrix = [
      orientation.x, 0, 0, position.x,
      0, orientation.y, 0, position.y,
      0, 0, orientation.z, position.z,
      0, 0, 0, 1
    ];

    // Calculate inverse matrix
    const inverse = this.invertMatrix(matrix);

    return {
      imageToWorld: matrix,
      worldToImage: inverse
    };
  }

  private invertMatrix(matrix: number[]): number[] {
    // Simplified 4x4 matrix inversion - in reality, we'd use a more robust method
    // This is just a placeholder implementation
    return [...matrix];
  }

  public setReferenceViewport(viewportId: string | null): void {
    this.state.referenceViewportId = viewportId;
    this.emit('referenceViewportChanged', viewportId);
  }

  public updateCrosshairPosition(viewportId: string, imagePosition: { x: number; y: number }): void {
    const viewport = this.viewportManager.getViewport(viewportId);
    if (!viewport || viewport.type !== 'volume') return;

    const imageToWorld = this.imageToWorldMatrices.get(viewportId);
    if (!imageToWorld) return;

    // Convert image position to world coordinates
    const worldPosition = this.transformPoint(imagePosition, imageToWorld);

    // Calculate positions in all other viewports
    const viewportPositions = new Map<string, { x: number; y: number }>();
    this.viewportManager.getViewports().forEach(otherViewport => {
      if (otherViewport.type === 'volume') {
        const worldToImage = this.worldToImageMatrices.get(otherViewport.id);
        if (worldToImage) {
          const imagePos = this.transformPoint(worldPosition, worldToImage);
          viewportPositions.set(otherViewport.id, imagePos);
        }
      }
    });

    this.state.currentPoint = {
      worldPosition,
      viewportPositions
    };

    this.emit('crosshairPositionUpdated', {
      worldPosition,
      viewportPositions,
      sourceViewportId: viewportId
    });
  }

  private transformPoint(point: { x: number; y: number } | Point3D, matrix: number[]): Point3D {
    // Transform point using 4x4 matrix
    const z = 'z' in point ? point.z : 0;
    
    return {
      x: matrix[0] * point.x + matrix[1] * point.y + matrix[2] * z + matrix[3],
      y: matrix[4] * point.x + matrix[5] * point.y + matrix[6] * z + matrix[7],
      z: matrix[8] * point.x + matrix[9] * point.y + matrix[10] * z + matrix[11]
    };
  }

  public getCurrentPoint(): CrosshairPoint | null {
    return this.state.currentPoint;
  }

  public isActive(): boolean {
    return this.state.isActive;
  }

  public setActive(active: boolean): void {
    this.state.isActive = active;
    this.emit('crosshairActiveChanged', active);
  }

  public destroy(): void {
    this.viewportManager.off('viewportCreated', this.handleViewportCreated);
    this.viewportManager.off('viewportDestroyed', this.handleViewportDestroyed);
    this.viewportManager.off('viewportUpdated', this.handleViewportUpdated);
    this.removeAllListeners();
  }
}