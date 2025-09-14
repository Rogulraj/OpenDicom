/**
 * @opendicom/events - Type-safe event system for DICOM viewer
 * 
 * This package provides a comprehensive event system with:
 * - Type-safe event definitions
 * - Event middleware pipeline
 * - Performance monitoring
 * - Event history and metrics
 * - Subscription management
 */

// Re-export types for external use
export * from './types';

// Export the EventManager class and instance
export { EventManager, eventManager } from './event-manager';

// Export middleware utilities
export { middleware } from './middleware';
export {
  loggingMiddleware,
  validationMiddleware,
  performanceMiddleware,
  rateLimitingMiddleware,
  circuitBreakerMiddleware,
  asyncMiddleware
} from './middleware';

// Package metadata
export const version = '1.0.0';
export const name = '@opendicom/events';

/**
 * Get package version
 */
export function getVersion(): string {
  return version;
}