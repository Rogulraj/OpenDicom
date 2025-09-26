import { EventEmitter } from '../events/EventEmitter';
import { ViewportManager } from './ViewportManager';
import { Viewport } from '../types/viewport';

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Plane {
  normal: Vector3;
  point: Vector3;
}

interface ReferenceLineIntersection {
  point: Vector3;
  angle: number;
}

export class MprReferenceLine extends EventEmitter {
  private viewportManager: ViewportManager;
  private planes: Map<string, Plane> = new Map();
  private intersections: Map<string, ReferenceLineIntersection[]> = new Map();

  constructor(viewportManager: ViewportManager) {
    super();
    this.viewportManager = viewportManager;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.viewportManager.on('viewportCreated', this.handleViewportCreated);
    this.viewportManager.on('viewportDestroyed', this.handleViewportDestroyed);
    this.viewportManager.on('viewportUpdated', this.handleViewportUpdated);
  }

  private handleViewportCreated = (viewport: Viewport): void => {
    if (viewport.type === 'volume') {
      this.updateViewportPlane(viewport);
    }
  };

  private handleViewportDestroyed = (viewportId: string): void => {
    this.planes.delete(viewportId);
    this.intersections.delete(viewportId);
    this.updateAllIntersections();
  };

  private handleViewportUpdated = (viewport: Viewport): void => {
    if (viewport.type === 'volume') {
      this.updateViewportPlane(viewport);
      this.updateAllIntersections();
    }
  };

  private updateViewportPlane(viewport: Viewport): void {
    // Calculate plane based on viewport orientation and position
    const plane = this.calculateViewportPlane(viewport);
    this.planes.set(viewport.id, plane);
  }

  private calculateViewportPlane(viewport: Viewport): Plane {
    // This is a simplified calculation - in reality, we'd use the actual
    // image orientation patient (IOP) and image position patient (IPP)
    const orientation = viewport.options?.orientation || { x: 0, y: 0, z: 1 };
    const position = viewport.options?.position || { x: 0, y: 0, z: 0 };

    return {
      normal: this.normalizeVector(orientation),
      point: position
    };
  }

  private normalizeVector(v: Vector3): Vector3 {
    const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    return {
      x: v.x / length,
      y: v.y / length,
      z: v.z / length
    };
  }

  private calculatePlaneIntersection(plane1: Plane, plane2: Plane): ReferenceLineIntersection | null {
    // Calculate the intersection line between two planes
    const normal1 = plane1.normal;
    const normal2 = plane2.normal;

    // Direction of intersection line is cross product of normals
    const direction = {
      x: normal1.y * normal2.z - normal1.z * normal2.y,
      y: normal1.z * normal2.x - normal1.x * normal2.z,
      z: normal1.x * normal2.y - normal1.y * normal2.x
    };

    // Check if planes are parallel
    const directionLength = Math.sqrt(
      direction.x * direction.x +
      direction.y * direction.y +
      direction.z * direction.z
    );

    if (directionLength < 1e-10) return null;

    // Calculate a point on the intersection line
    const point = this.calculateIntersectionPoint(plane1, plane2, direction);
    
    // Calculate angle between planes
    const angle = Math.acos(
      normal1.x * normal2.x +
      normal1.y * normal2.y +
      normal1.z * normal2.z
    );

    return {
      point,
      angle: angle * (180 / Math.PI)
    };
  }

  private calculateIntersectionPoint(plane1: Plane, plane2: Plane, direction: Vector3): Vector3 {
    // This is a simplified calculation - in a real implementation,
    // we'd need to consider the actual image bounds
    return {
      x: (plane1.point.x + plane2.point.x) / 2,
      y: (plane1.point.y + plane2.point.y) / 2,
      z: (plane1.point.z + plane2.point.z) / 2
    };
  }

  private updateAllIntersections(): void {
    const viewports = Array.from(this.planes.keys());
    
    viewports.forEach(viewportId => {
      const intersections: ReferenceLineIntersection[] = [];
      const currentPlane = this.planes.get(viewportId);
      
      viewports.forEach(otherId => {
        if (otherId !== viewportId) {
          const otherPlane = this.planes.get(otherId);
          if (currentPlane && otherPlane) {
            const intersection = this.calculatePlaneIntersection(currentPlane, otherPlane);
            if (intersection) {
              intersections.push(intersection);
            }
          }
        }
      });

      this.intersections.set(viewportId, intersections);
      this.emit('referenceLineUpdated', { viewportId, intersections });
    });
  }

  public getIntersections(viewportId: string): ReferenceLineIntersection[] {
    return this.intersections.get(viewportId) || [];
  }

  public destroy(): void {
    this.viewportManager.off('viewportCreated', this.handleViewportCreated);
    this.viewportManager.off('viewportDestroyed', this.handleViewportDestroyed);
    this.viewportManager.off('viewportUpdated', this.handleViewportUpdated);
    this.removeAllListeners();
  }
}