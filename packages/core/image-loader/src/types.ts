/**
 * Types for DICOM image loading and caching
 */

import type { DicomImage, LoadingState } from '@opendicom/core';

/**
 * Image loading priority levels
 */
export enum LoadingPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

/**
 * Image loading request interface
 */
export interface ImageLoadRequest {
  imageId: string;
  priority: LoadingPriority;
  options?: ImageLoadOptions;
}

/**
 * Options for image loading
 */
export interface ImageLoadOptions {
  useWebWorker?: boolean;
  timeout?: number;
  retryAttempts?: number;
  progressCallback?: (progress: number) => void;
}

/**
 * Image loading result
 */
export interface ImageLoadResult {
  image: DicomImage;
  loadTime: number;
  fromCache: boolean;
}

/**
 * Image cache entry
 */
export interface CacheEntry {
  imageId: string;
  image: DicomImage;
  timestamp: number;
  accessCount: number;
  size: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
}

/**
 * Image loader events
 */
export interface ImageLoaderEvents {
  'image-load-start': { imageId: string };
  'image-load-progress': { imageId: string; progress: number };
  'image-load-complete': { imageId: string; result: ImageLoadResult };
  'image-load-error': { imageId: string; error: Error };
  'cache-updated': { stats: CacheStats };
}

/**
 * Web worker message types
 */
export interface WorkerMessage {
  type: 'load-image' | 'load-complete' | 'load-error' | 'load-progress';
  payload: any;
  requestId: string;
}