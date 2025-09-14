/**
 * @opendicom/ui
 * UI components and themes for DICOM viewer applications
 */

export * from './components';
export * from './hooks';
export * from './themes';
export * from './types';
export * from './utils';

// Version information
export const version = '0.1.0';

// Re-export core types that are commonly used
export type {
  DicomImage,
  Viewport,
  Tool
} from '@opendicom/core';

/**
 * UI configuration interface
 */
export interface UIConfig {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  enableAnimations: boolean;
  enableTooltips: boolean;
  enableKeyboardShortcuts: boolean;
}

/**
 * Default configuration for the UI system
 */
export const defaultConfig: UIConfig = {
  theme: 'dark',
  language: 'en',
  enableAnimations: true,
  enableTooltips: true,
  enableKeyboardShortcuts: true
};

/**
 * Initialize the DICOM UI system with configuration
 */
export function initializeUI(config: Partial<UIConfig> = {}): void {
  const finalConfig = { ...defaultConfig, ...config };
  // Initialize UI system with configuration
  console.log('DICOM UI System initialized with config:', finalConfig);
}

/**
 * Get the current version of the UI system
 */
export function getVersion(): string {
  return version;
}