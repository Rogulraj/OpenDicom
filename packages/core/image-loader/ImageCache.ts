interface CacheEntry {
  imageData: ImageData;
  timestamp: number;
  size: number;
}

interface ProgressiveImage {
  lowRes: ImageData;
  fullRes: ImageData | null;
  loading: boolean;
}

export class ImageCache {
  private cache: Map<string, CacheEntry>;
  private progressiveCache: Map<string, ProgressiveImage>;
  private maxSize: number;
  private currentSize: number;
  private lowResThreshold: number;

  constructor(maxSizeMB = 1024) {
    this.cache = new Map();
    this.progressiveCache = new Map();
    this.maxSize = maxSizeMB * 1024 * 1024; // Convert to bytes
    this.currentSize = 0;
    this.lowResThreshold = 256 * 256 * 4; // Threshold for low-res images
  }

  set(imageId: string, imageData: ImageData): void {
    const size = this.calculateImageSize(imageData);

    // Create progressive version if image is large
    if (size > this.lowResThreshold) {
      this.setProgressiveImage(imageId, imageData);
    }

    // Ensure space for new image
    this.ensureCapacity(size);

    // Add to cache
    this.cache.set(imageId, {
      imageData,
      timestamp: Date.now(),
      size
    });
    this.currentSize += size;
  }

  get(imageId: string): ImageData | null {
    const entry = this.cache.get(imageId);
    if (entry) {
      // Update timestamp on access
      entry.timestamp = Date.now();
      return entry.imageData;
    }

    // Check progressive cache
    const progressive = this.progressiveCache.get(imageId);
    if (progressive) {
      return progressive.fullRes || progressive.lowRes;
    }

    return null;
  }

  getLowResImage(imageId: string): ImageData | null {
    const progressive = this.progressiveCache.get(imageId);
    return progressive ? progressive.lowRes : null;
  }

  private setProgressiveImage(imageId: string, imageData: ImageData): void {
    const lowRes = this.createLowResVersion(imageData);
    
    this.progressiveCache.set(imageId, {
      lowRes,
      fullRes: null,
      loading: true
    });

    // Asynchronously set full resolution version
    setTimeout(() => {
      const entry = this.progressiveCache.get(imageId);
      if (entry) {
        entry.fullRes = imageData;
        entry.loading = false;
      }
    }, 0);
  }

  private createLowResVersion(imageData: ImageData): ImageData {
    const scale = 0.25;
    const canvas = new OffscreenCanvas(
      imageData.width * scale,
      imageData.height * scale
    );
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get 2D context for low-res conversion');
    }

    // Draw original image at reduced size
    ctx.drawImage(
      createImageBitmap(imageData),
      0, 0,
      canvas.width,
      canvas.height
    );

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  private calculateImageSize(imageData: ImageData): number {
    return imageData.data.length;
  }

  private ensureCapacity(requiredSize: number): void {
    if (requiredSize > this.maxSize) {
      throw new Error('Image size exceeds cache capacity');
    }

    while (this.currentSize + requiredSize > this.maxSize) {
      this.evictLRU();
    }
  }

  private evictLRU(): void {
    let oldestTimestamp = Infinity;
    let oldestKey: string | null = null;

    // Find oldest entry
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey)!;
      this.currentSize -= entry.size;
      this.cache.delete(oldestKey);
      this.progressiveCache.delete(oldestKey);
    }
  }

  clear(): void {
    this.cache.clear();
    this.progressiveCache.clear();
    this.currentSize = 0;
  }

  getStats(): {
    totalSize: number;
    maxSize: number;
    itemCount: number;
    progressiveItemCount: number;
  } {
    return {
      totalSize: this.currentSize,
      maxSize: this.maxSize,
      itemCount: this.cache.size,
      progressiveItemCount: this.progressiveCache.size
    };
  }
}