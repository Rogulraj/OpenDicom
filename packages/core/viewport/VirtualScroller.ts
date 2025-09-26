import { EventEmitter } from '../events/EventEmitter';
import { DicomImageLoader } from '../image-loader/DicomImageLoader';
import { ImageCache } from '../image-loader/ImageCache';

interface ScrollState {
  currentIndex: number;
  visibleRange: {
    start: number;
    end: number;
  };
  totalImages: number;
  loadedImages: Set<number>;
  preloadRange: {
    start: number;
    end: number;
  };
}

interface ScrollOptions {
  visibleCount: number;
  preloadCount: number;
  loadingThreshold: number;
  debounceMs: number;
}

export class VirtualScroller extends EventEmitter {
  private state: ScrollState;
  private options: ScrollOptions;
  private imageLoader: DicomImageLoader;
  private imageCache: ImageCache;
  private scrollDebounceTimeout: NodeJS.Timeout | null = null;
  private loadingInProgress: boolean = false;

  constructor(
    totalImages: number,
    imageLoader: DicomImageLoader,
    imageCache: ImageCache,
    options: Partial<ScrollOptions> = {}
  ) {
    super();
    this.imageLoader = imageLoader;
    this.imageCache = imageCache;

    this.options = {
      visibleCount: options.visibleCount || 5,
      preloadCount: options.preloadCount || 10,
      loadingThreshold: options.loadingThreshold || 0.8,
      debounceMs: options.debounceMs || 150
    };

    this.state = {
      currentIndex: 0,
      visibleRange: {
        start: 0,
        end: this.options.visibleCount - 1
      },
      preloadRange: {
        start: 0,
        end: this.options.preloadCount - 1
      },
      totalImages,
      loadedImages: new Set()
    };

    this.initializePreload();
  }

  private async initializePreload(): Promise<void> {
    await this.loadImagesInRange(
      this.state.preloadRange.start,
      this.state.preloadRange.end
    );
  }

  private async loadImagesInRange(start: number, end: number): Promise<void> {
    if (this.loadingInProgress) return;
    this.loadingInProgress = true;

    try {
      const indices = Array.from(
        { length: end - start + 1 },
        (_, i) => start + i
      ).filter(
        index =>
          index >= 0 &&
          index < this.state.totalImages &&
          !this.state.loadedImages.has(index)
      );

      const loadPromises = indices.map(async index => {
        try {
          const image = await this.imageLoader.loadImage(index);
          this.imageCache.set(`image-${index}`, image);
          this.state.loadedImages.add(index);
          this.emit('imageLoaded', { index, image });
        } catch (error) {
          console.error(`Failed to load image at index ${index}:`, error);
          this.emit('imageLoadError', { index, error });
        }
      });

      await Promise.all(loadPromises);
    } finally {
      this.loadingInProgress = false;
    }
  }

  public async scrollTo(index: number): Promise<void> {
    if (index < 0 || index >= this.state.totalImages) {
      throw new Error('Index out of bounds');
    }

    if (this.scrollDebounceTimeout) {
      clearTimeout(this.scrollDebounceTimeout);
    }

    this.scrollDebounceTimeout = setTimeout(async () => {
      const oldVisibleRange = { ...this.state.visibleRange };
      const halfVisible = Math.floor(this.options.visibleCount / 2);

      this.state.currentIndex = index;
      this.state.visibleRange = {
        start: Math.max(0, index - halfVisible),
        end: Math.min(
          this.state.totalImages - 1,
          index + halfVisible
        )
      };

      this.state.preloadRange = {
        start: Math.max(0, this.state.visibleRange.start - this.options.preloadCount),
        end: Math.min(
          this.state.totalImages - 1,
          this.state.visibleRange.end + this.options.preloadCount
        )
      };

      // Load new images in preload range
      await this.loadImagesInRange(
        this.state.preloadRange.start,
        this.state.preloadRange.end
      );

      // Cleanup images outside extended preload range
      this.cleanupOutOfRangeImages();

      this.emit('visibleRangeChanged', {
        oldRange: oldVisibleRange,
        newRange: this.state.visibleRange,
        currentIndex: this.state.currentIndex
      });
    }, this.options.debounceMs);
  }

  private cleanupOutOfRangeImages(): void {
    const extendedRange = {
      start: Math.max(0, this.state.preloadRange.start - this.options.preloadCount),
      end: Math.min(
        this.state.totalImages - 1,
        this.state.preloadRange.end + this.options.preloadCount
      )
    };

    // Remove images from cache that are outside the extended range
    this.state.loadedImages.forEach(index => {
      if (index < extendedRange.start || index > extendedRange.end) {
        this.imageCache.remove(`image-${index}`);
        this.state.loadedImages.delete(index);
        this.emit('imageUnloaded', { index });
      }
    });
  }

  public getVisibleImages(): { index: number; loaded: boolean }[] {
    const images = [];
    for (
      let i = this.state.visibleRange.start;
      i <= this.state.visibleRange.end;
      i++
    ) {
      images.push({
        index: i,
        loaded: this.state.loadedImages.has(i)
      });
    }
    return images;
  }

  public getCurrentIndex(): number {
    return this.state.currentIndex;
  }

  public getTotalImages(): number {
    return this.state.totalImages;
  }

  public getLoadedImagesCount(): number {
    return this.state.loadedImages.size;
  }

  public isImageLoaded(index: number): boolean {
    return this.state.loadedImages.has(index);
  }

  public destroy(): void {
    if (this.scrollDebounceTimeout) {
      clearTimeout(this.scrollDebounceTimeout);
    }
    this.removeAllListeners();
    this.cleanupOutOfRangeImages();
  }
}