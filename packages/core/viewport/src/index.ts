/**
 * @opendicom/viewport
 * Viewport management and rendering for DICOM images
 */

export * from './types';
export * from './viewport';
export * from './renderer';
export * from './utils';

// Version information
export const version = '0.1.0';

// Re-export core types that are commonly used
export type {
  DicomImage,
  Viewport,
  DicomMetadata
} from '@opendicom/core';

/**
 * Viewport configuration interface
 */
export interface ViewportConfig {
  enableInterpolation: boolean;
  enableCaching: boolean;
  maxCacheSize: number;
  renderingEngine: 'canvas' | 'webgl';
  enableWebWorkers: boolean;
}

/**
 * Default configuration for the viewport system
 */
export const defaultConfig: ViewportConfig = {
  enableInterpolation: true,
  enableCaching: true,
  maxCacheSize: 50,
  renderingEngine: 'canvas',
  enableWebWorkers: false
};

/**
 * Initialize the DICOM viewport system with configuration
 */
export function initializeViewport(config: Partial<ViewportConfig> = {}): void {
  const finalConfig = { ...defaultConfig, ...config };
  // Initialize viewport system with configuration
  console.log('DICOM Viewport System initialized with config:', finalConfig);
}

/**
 * Get the current version of the viewport system
 */
export function getVersion(): string {
  return version;
}