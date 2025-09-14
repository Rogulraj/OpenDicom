/**
 * @opendicom/image-loader
 * DICOM image loading and caching for medical imaging applications
 */

export * from './types';
export * from './loader';
export * from './cache';
export * from './utils';

// Version information
export const version = '0.1.0';

// Re-export core types that are commonly used
export type {
  DicomImage,
  DicomMetadata,
  LoadingState
} from '@opendicom/core';

/**
 * Image loader configuration interface
 */
export interface ImageLoaderConfig {
  maxCacheSize: number;
  enableWebWorkers: boolean;
  workerPath?: string;
  timeout: number;
  retryAttempts: number;
}

/**
 * Default configuration for the image loader
 */
export const defaultConfig: ImageLoaderConfig = {
  maxCacheSize: 100,
  enableWebWorkers: true,
  timeout: 30000,
  retryAttempts: 3
};

/**
 * Initialize the DICOM image loader with configuration
 */
export function initializeImageLoader(config: Partial<ImageLoaderConfig> = {}): void {
  const finalConfig = { ...defaultConfig, ...config };
  // Initialize loader with configuration
  console.log('DICOM Image Loader initialized with config:', finalConfig);
}

/**
 * Get the current version of the image loader
 */
export function getVersion(): string {
  return version;
}