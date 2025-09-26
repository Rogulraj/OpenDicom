import { DicomImageLoader } from './DicomImageLoader';
import { EventEmitter } from '../events/EventEmitter';

interface PrefetchRule {
  pattern: string | RegExp;
  priority: 'high' | 'medium' | 'low';
  maxConcurrent: number;
}

interface PrefetchTask {
  imageId: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
}

export class ImagePrefetcher extends EventEmitter {
  private static instance: ImagePrefetcher;
  private imageLoader: DicomImageLoader;
  private rules: PrefetchRule[] = [];
  private queue: PrefetchTask[] = [];
  private loading: Set<string> = new Set();
  private maxConcurrentLoads: number;
  private paused: boolean = false;

  private constructor() {
    super();
    this.imageLoader = DicomImageLoader.getInstance();
    this.maxConcurrentLoads = 3;
    this.setupDefaultRules();
  }

  static getInstance(): ImagePrefetcher {
    if (!ImagePrefetcher.instance) {
      ImagePrefetcher.instance = new ImagePrefetcher();
    }
    return ImagePrefetcher.instance;
  }

  private setupDefaultRules(): void {
    this.addRule({
      pattern: /^wadors:/,
      priority: 'medium',
      maxConcurrent: 2
    });

    this.addRule({
      pattern: /^wadouri:/,
      priority: 'medium',
      maxConcurrent: 2
    });

    this.addRule({
      pattern: /^file:/,
      priority: 'high',
      maxConcurrent: 3
    });
  }

  addRule(rule: PrefetchRule): void {
    this.rules.push(rule);
  }

  prefetch(imageIds: string[]): void {
    // Add images to queue based on rules
    imageIds.forEach(imageId => {
      const rule = this.findMatchingRule(imageId);
      if (rule) {
        this.queue.push({
          imageId,
          priority: rule.priority,
          timestamp: Date.now()
        });
      }
    });

    // Sort queue by priority and timestamp
    this.sortQueue();

    // Start processing if not paused
    if (!this.paused) {
      this.processQueue();
    }
  }

  private findMatchingRule(imageId: string): PrefetchRule | undefined {
    return this.rules.find(rule => {
      if (typeof rule.pattern === 'string') {
        return imageId.startsWith(rule.pattern);
      }
      return rule.pattern.test(imageId);
    });
  }

  private sortQueue(): void {
    const priorityWeight = {
      high: 3,
      medium: 2,
      low: 1
    };

    this.queue.sort((a, b) => {
      const weightDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (weightDiff !== 0) return weightDiff;
      return a.timestamp - b.timestamp;
    });
  }

  private async processQueue(): Promise<void> {
    if (this.paused || this.queue.length === 0) return;

    // Check if we can load more images
    const availableSlots = this.maxConcurrentLoads - this.loading.size;
    if (availableSlots <= 0) return;

    // Get next batch of images to load
    const batch = this.queue.splice(0, availableSlots);

    // Load images in parallel
    const loadPromises = batch.map(async task => {
      this.loading.add(task.imageId);

      try {
        await this.imageLoader.loadImage(task.imageId, {
          priority: task.priority,
          progressive: true
        });

        this.emit('imagePrefetched', {
          imageId: task.imageId,
          success: true
        });
      } catch (error) {
        this.emit('imagePrefetched', {
          imageId: task.imageId,
          success: false,
          error
        });
      } finally {
        this.loading.delete(task.imageId);
      }
    });

    // Wait for all loads to complete
    await Promise.all(loadPromises);

    // Continue processing queue
    if (this.queue.length > 0) {
      this.processQueue();
    }
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    this.processQueue();
  }

  clear(): void {
    this.queue = [];
    this.loading.clear();
  }

  getStats(): {
    queueLength: number;
    loadingCount: number;
    paused: boolean;
  } {
    return {
      queueLength: this.queue.length,
      loadingCount: this.loading.size,
      paused: this.paused
    };
  }
}