import { EventEmitter } from '../events/EventEmitter';
import { DicomImageLoader } from './DicomImageLoader';

interface QualityLevel {
  resolution: number; // percentage of original resolution
  compression: number; // compression quality (0-100)
  priority: number;
}

interface LoadingStrategy {
  initialQuality: QualityLevel;
  progressiveLevels: QualityLevel[];
  networkThresholds: {
    slow: number; // kbps
    medium: number; // kbps
  };
  concurrentLoads: number;
}

interface ProgressiveLoadState {
  imageId: string;
  currentQuality: QualityLevel;
  loadedQualities: Set<number>;
  aborted: boolean;
}

export class ProgressiveLoader extends EventEmitter {
  private imageLoader: DicomImageLoader;
  private strategy: LoadingStrategy;
  private loadingStates: Map<string, ProgressiveLoadState> = new Map();
  private networkSpeed: number = Infinity;
  private lastSpeedCheck: number = 0;
  private speedCheckInterval: number = 5000; // 5 seconds
  private loadQueue: Array<{ imageId: string; priority: number }> = [];
  private activeLoads: number = 0;

  constructor(
    imageLoader: DicomImageLoader,
    strategy: Partial<LoadingStrategy> = {}
  ) {
    super();
    this.imageLoader = imageLoader;

    this.strategy = {
      initialQuality: {
        resolution: 25,
        compression: 60,
        priority: 1
      },
      progressiveLevels: [
        { resolution: 50, compression: 75, priority: 2 },
        { resolution: 75, compression: 85, priority: 3 },
        { resolution: 100, compression: 100, priority: 4 }
      ],
      networkThresholds: {
        slow: 500, // 500 kbps
        medium: 2000 // 2 Mbps
      },
      concurrentLoads: 3,
      ...strategy
    };

    this.startNetworkSpeedMonitoring();
  }

  private startNetworkSpeedMonitoring(): void {
    // Monitor network conditions using Resource Timing API
    if (typeof window !== 'undefined' && window.performance) {
      setInterval(() => {
        this.updateNetworkSpeed();
      }, this.speedCheckInterval);
    }
  }

  private updateNetworkSpeed(): void {
    if (!window.performance || !window.performance.getEntriesByType) return;

    const entries = window.performance.getEntriesByType('resource');
    const now = Date.now();
    const recentEntries = entries.filter(
      entry =>
        entry.startTime > now - this.speedCheckInterval &&
        entry.transferSize > 0
    );

    if (recentEntries.length > 0) {
      const totalBytes = recentEntries.reduce(
        (sum, entry) => sum + entry.transferSize,
        0
      );
      const totalTime = recentEntries.reduce(
        (sum, entry) => sum + entry.duration,
        0
      );

      // Calculate speed in kbps
      this.networkSpeed = (totalBytes * 8) / (totalTime / 1000) / 1024;
      this.emit('networkSpeedUpdated', this.networkSpeed);
    }
  }

  private getOptimalQualityLevel(): QualityLevel {
    if (this.networkSpeed <= this.strategy.networkThresholds.slow) {
      return this.strategy.initialQuality;
    } else if (this.networkSpeed <= this.strategy.networkThresholds.medium) {
      return this.strategy.progressiveLevels[0];
    }
    return this.strategy.progressiveLevels[
      this.strategy.progressiveLevels.length - 1
    ];
  }

  public async loadImage(
    imageId: string,
    priority: number = 1
  ): Promise<void> {
    if (this.loadingStates.has(imageId)) {
      return;
    }

    const state: ProgressiveLoadState = {
      imageId,
      currentQuality: this.strategy.initialQuality,
      loadedQualities: new Set(),
      aborted: false
    };

    this.loadingStates.set(imageId, state);
    this.loadQueue.push({ imageId, priority });
    this.loadQueue.sort((a, b) => b.priority - a.priority);

    await this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.activeLoads >= this.strategy.concurrentLoads) {
      return;
    }

    while (
      this.loadQueue.length > 0 &&
      this.activeLoads < this.strategy.concurrentLoads
    ) {
      const { imageId } = this.loadQueue.shift()!;
      const state = this.loadingStates.get(imageId);

      if (state && !state.aborted) {
        this.activeLoads++;
        await this.loadProgressively(state);
        this.activeLoads--;
      }
    }
  }

  private async loadProgressively(
    state: ProgressiveLoadState
  ): Promise<void> {
    const optimalQuality = this.getOptimalQualityLevel();
    const qualities = [
      this.strategy.initialQuality,
      ...this.strategy.progressiveLevels.filter(
        q => q.priority <= optimalQuality.priority
      )
    ];

    for (const quality of qualities) {
      if (state.aborted || state.loadedQualities.has(quality.priority)) {
        continue;
      }

      try {
        const image = await this.imageLoader.loadImage(state.imageId, {
          resolution: quality.resolution,
          compression: quality.compression
        });

        if (!state.aborted) {
          state.currentQuality = quality;
          state.loadedQualities.add(quality.priority);

          this.emit('qualityLevelLoaded', {
            imageId: state.imageId,
            quality,
            image
          });
        }
      } catch (error) {
        if (!state.aborted) {
          this.emit('loadError', {
            imageId: state.imageId,
            quality,
            error
          });
        }
      }
    }

    if (!state.aborted) {
      this.emit('loadComplete', {
        imageId: state.imageId,
        finalQuality: state.currentQuality
      });
    }
  }

  public abortLoading(imageId: string): void {
    const state = this.loadingStates.get(imageId);
    if (state) {
      state.aborted = true;
      this.loadQueue = this.loadQueue.filter(item => item.imageId !== imageId);
      this.loadingStates.delete(imageId);
      this.emit('loadAborted', { imageId });
    }
  }

  public updateLoadingPriority(imageId: string, priority: number): void {
    const queueItem = this.loadQueue.find(item => item.imageId === imageId);
    if (queueItem) {
      queueItem.priority = priority;
      this.loadQueue.sort((a, b) => b.priority - a.priority);
    }
  }

  public destroy(): void {
    // Abort all pending loads
    this.loadingStates.forEach((state, imageId) => {
      this.abortLoading(imageId);
    });

    this.loadQueue = [];
    this.loadingStates.clear();
    this.removeAllListeners();
  }
}