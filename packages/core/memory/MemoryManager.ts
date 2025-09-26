import { EventEmitter } from '../events/EventEmitter';
import { ImageCache } from '../image-loader/ImageCache';

interface MemoryStats {
  totalHeapSize: number;
  usedHeapSize: number;
  imagesCacheSize: number;
  activeViewports: number;
}

interface MemoryThresholds {
  heapUsageThreshold: number;
  imageCacheMaxSize: number;
  cleanupInterval: number;
}

interface DisposableResource {
  dispose: () => void;
  lastUsed: number;
  size: number;
  priority: number;
}

export class MemoryManager extends EventEmitter {
  private imageCache: ImageCache;
  private disposableResources: Map<string, DisposableResource> = new Map();
  private thresholds: MemoryThresholds;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isCleanupInProgress: boolean = false;

  constructor(
    imageCache: ImageCache,
    thresholds: Partial<MemoryThresholds> = {}
  ) {
    super();
    this.imageCache = imageCache;

    this.thresholds = {
      heapUsageThreshold: thresholds.heapUsageThreshold || 0.8, // 80% of available heap
      imageCacheMaxSize: thresholds.imageCacheMaxSize || 1024 * 1024 * 1024, // 1GB
      cleanupInterval: thresholds.cleanupInterval || 30000 // 30 seconds
    };

    this.startPeriodicCleanup();
  }

  private startPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.thresholds.cleanupInterval);
  }

  public registerDisposableResource(
    id: string,
    resource: DisposableResource
  ): void {
    this.disposableResources.set(id, {
      ...resource,
      lastUsed: Date.now()
    });
  }

  public updateResourceUsage(id: string): void {
    const resource = this.disposableResources.get(id);
    if (resource) {
      resource.lastUsed = Date.now();
    }
  }

  public async performCleanup(): Promise<void> {
    if (this.isCleanupInProgress) return;
    this.isCleanupInProgress = true;

    try {
      const stats = await this.getMemoryStats();
      const heapUsageRatio = stats.usedHeapSize / stats.totalHeapSize;

      if (
        heapUsageRatio > this.thresholds.heapUsageThreshold ||
        stats.imagesCacheSize > this.thresholds.imageCacheMaxSize
      ) {
        await this.cleanupResources(stats);
      }

      this.emit('cleanupCompleted', await this.getMemoryStats());
    } catch (error) {
      console.error('Memory cleanup failed:', error);
      this.emit('cleanupError', error);
    } finally {
      this.isCleanupInProgress = false;
    }
  }

  private async cleanupResources(stats: MemoryStats): Promise<void> {
    // Sort resources by priority (lower = less important) and last used time
    const sortedResources = Array.from(this.disposableResources.entries())
      .sort(([, a], [, b]) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.lastUsed - b.lastUsed;
      });

    let freedMemory = 0;
    const targetFreed = Math.max(
      stats.usedHeapSize - stats.totalHeapSize * this.thresholds.heapUsageThreshold,
      stats.imagesCacheSize - this.thresholds.imageCacheMaxSize
    );

    for (const [id, resource] of sortedResources) {
      if (freedMemory >= targetFreed) break;

      try {
        await resource.dispose();
        this.disposableResources.delete(id);
        freedMemory += resource.size;

        this.emit('resourceDisposed', {
          id,
          size: resource.size,
          totalFreed: freedMemory
        });
      } catch (error) {
        console.error(`Failed to dispose resource ${id}:`, error);
        this.emit('resourceDisposeError', { id, error });
      }
    }
  }

  public async getMemoryStats(): Promise<MemoryStats> {
    // In a browser environment, we would use performance.memory
    // This is a simplified version
    const stats: MemoryStats = {
      totalHeapSize: 0,
      usedHeapSize: 0,
      imagesCacheSize: this.imageCache.getSize(),
      activeViewports: 0
    };

    if (typeof window !== 'undefined' && (window.performance as any).memory) {
      const memory = (window.performance as any).memory;
      stats.totalHeapSize = memory.jsHeapSizeLimit;
      stats.usedHeapSize = memory.usedJSHeapSize;
    }

    return stats;
  }

  public setThresholds(newThresholds: Partial<MemoryThresholds>): void {
    this.thresholds = {
      ...this.thresholds,
      ...newThresholds
    };

    if (newThresholds.cleanupInterval) {
      this.startPeriodicCleanup();
    }
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Dispose all resources
    this.disposableResources.forEach((resource, id) => {
      try {
        resource.dispose();
        this.emit('resourceDisposed', { id, size: resource.size });
      } catch (error) {
        console.error(`Failed to dispose resource ${id} during destroy:`, error);
      }
    });

    this.disposableResources.clear();
    this.removeAllListeners();
  }
}