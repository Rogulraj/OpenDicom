import { EventEmitter } from '../events/EventEmitter';
import { TransferSyntax } from '../types/dicom';
import { WorkerPool } from './WorkerPool';
import { ImageCache } from './ImageCache';

export interface LoadImageOptions {
  priority?: 'high' | 'medium' | 'low';
  progressive?: boolean;
  signal?: AbortSignal;
}

export interface ImageLoadProgress {
  loaded: number;
  total: number;
  stage: 'download' | 'decode' | 'process';
}

export class DicomImageLoader extends EventEmitter {
  private static instance: DicomImageLoader;
  private workerPool: WorkerPool;
  private imageCache: ImageCache;
  private loadingQueue: Map<string, Promise<ArrayBuffer>>;
  private abortControllers: Map<string, AbortController>;

  private constructor() {
    super();
    this.workerPool = new WorkerPool();
    this.imageCache = new ImageCache();
    this.loadingQueue = new Map();
    this.abortControllers = new Map();
  }

  static getInstance(): DicomImageLoader {
    if (!DicomImageLoader.instance) {
      DicomImageLoader.instance = new DicomImageLoader();
    }
    return DicomImageLoader.instance;
  }

  async loadImage(
    imageId: string,
    options: LoadImageOptions = {}
  ): Promise<ImageData> {
    // Check cache first
    const cachedImage = this.imageCache.get(imageId);
    if (cachedImage) {
      return cachedImage;
    }

    // Create abort controller for this request
    const abortController = new AbortController();
    this.abortControllers.set(imageId, abortController);

    try {
      // Combine options signal with internal abort controller
      const signal = options.signal
        ? this.createCombinedAbortSignal(options.signal, abortController.signal)
        : abortController.signal;

      // Queue the image loading
      const loadPromise = this.queueImageLoad(imageId, {
        ...options,
        signal
      });

      // Add to loading queue
      this.loadingQueue.set(imageId, loadPromise);

      // Load and process the image
      const imageArrayBuffer = await loadPromise;
      const imageData = await this.processImage(imageArrayBuffer, imageId, options);

      // Cache the result
      this.imageCache.set(imageId, imageData);

      // Cleanup
      this.loadingQueue.delete(imageId);
      this.abortControllers.delete(imageId);

      return imageData;
    } catch (error) {
      // Cleanup on error
      this.loadingQueue.delete(imageId);
      this.abortControllers.delete(imageId);

      if (error.name === 'AbortError') {
        throw new Error(`Loading of image ${imageId} was aborted`);
      }
      throw error;
    }
  }

  private async queueImageLoad(
    imageId: string,
    options: LoadImageOptions & { signal: AbortSignal }
  ): Promise<ArrayBuffer> {
    // Parse image ID to determine loading strategy
    const protocol = this.getImageProtocol(imageId);
    
    switch (protocol) {
      case 'wadouri':
        return this.loadWadoUriImage(imageId, options);
      case 'wadors':
        return this.loadWadoRsImage(imageId, options);
      case 'file':
        return this.loadLocalImage(imageId, options);
      default:
        throw new Error(`Unsupported protocol: ${protocol}`);
    }
  }

  private getImageProtocol(imageId: string): string {
    const colonIndex = imageId.indexOf(':');
    return colonIndex > -1 ? imageId.substring(0, colonIndex) : 'file';
  }

  private async processImage(
    arrayBuffer: ArrayBuffer,
    imageId: string,
    options: LoadImageOptions
  ): Promise<ImageData> {
    // Determine transfer syntax
    const transferSyntax = await this.detectTransferSyntax(arrayBuffer);

    // Emit progress event
    this.emit('imageLoadProgress', {
      imageId,
      loaded: 0,
      total: 100,
      stage: 'decode'
    } as ImageLoadProgress);

    // Process based on transfer syntax
    let pixelData: Uint8ClampedArray;
    switch (transferSyntax) {
      case TransferSyntax.JPEG:
        pixelData = await this.decodeJPEG(arrayBuffer);
        break;
      case TransferSyntax.JPEG_LS:
        pixelData = await this.decodeJPEGLS(arrayBuffer);
        break;
      case TransferSyntax.JPEG_2000:
        pixelData = await this.decodeJPEG2000(arrayBuffer);
        break;
      default:
        pixelData = await this.decodeUncompressed(arrayBuffer);
    }

    // Create ImageData
    const metadata = await this.extractMetadata(arrayBuffer);
    return new ImageData(
      pixelData,
      metadata.width,
      metadata.height
    );
  }

  private async detectTransferSyntax(arrayBuffer: ArrayBuffer): Promise<TransferSyntax> {
    // Implement transfer syntax detection logic
    return TransferSyntax.EXPLICIT_VR_LITTLE_ENDIAN;
  }

  private async extractMetadata(arrayBuffer: ArrayBuffer): Promise<{
    width: number;
    height: number;
  }> {
    // Implement metadata extraction logic
    return {
      width: 512,
      height: 512
    };
  }

  private async decodeJPEG(arrayBuffer: ArrayBuffer): Promise<Uint8ClampedArray> {
    return this.workerPool.decode('jpeg', arrayBuffer);
  }

  private async decodeJPEGLS(arrayBuffer: ArrayBuffer): Promise<Uint8ClampedArray> {
    return this.workerPool.decode('jpeg-ls', arrayBuffer);
  }

  private async decodeJPEG2000(arrayBuffer: ArrayBuffer): Promise<Uint8ClampedArray> {
    return this.workerPool.decode('jpeg2000', arrayBuffer);
  }

  private async decodeUncompressed(arrayBuffer: ArrayBuffer): Promise<Uint8ClampedArray> {
    return this.workerPool.decode('raw', arrayBuffer);
  }

  private createCombinedAbortSignal(
    signal1: AbortSignal,
    signal2: AbortSignal
  ): AbortSignal {
    const controller = new AbortController();
    
    const abort = () => controller.abort();
    signal1.addEventListener('abort', abort);
    signal2.addEventListener('abort', abort);

    return controller.signal;
  }

  cancelLoadImage(imageId: string): void {
    const controller = this.abortControllers.get(imageId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(imageId);
      this.loadingQueue.delete(imageId);
    }
  }

  prefetchImage(imageId: string): void {
    // Start loading but don't await the result
    this.loadImage(imageId, { priority: 'low' }).catch(() => {
      // Ignore prefetch errors
    });
  }

  clearCache(): void {
    this.imageCache.clear();
  }
}