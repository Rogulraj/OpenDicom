/**
 * Utility functions for DICOM processing
 */

import { DicomImage, DicomMetadata } from './types';

/**
 * Generate a unique image ID for DICOM images
 * @param studyUID Study Instance UID
 * @param seriesUID Series Instance UID
 * @param instanceUID SOP Instance UID
 * @returns Formatted image ID
 */
export function generateImageId(
  studyUID: string,
  seriesUID: string,
  instanceUID: string
): string {
  return `dicom:${studyUID}/${seriesUID}/${instanceUID}`;
}

/**
 * Parse image ID to extract DICOM UIDs
 * @param imageId Image ID string
 * @returns Parsed DICOM UIDs or null if invalid
 */
export function parseImageId(imageId: string): {
  studyUID: string;
  seriesUID: string;
  instanceUID: string;
} | null {
  const match = imageId.match(/^dicom:([^/]+)\/([^/]+)\/([^/]+)$/);
  if (!match) return null;
  
  return {
    studyUID: match[1],
    seriesUID: match[2],
    instanceUID: match[3],
  };
}

/**
 * Calculate window/level values for optimal display
 * @param pixelData Pixel data array
 * @param bitsStored Number of bits stored
 * @returns Calculated window center and width
 */
export function calculateOptimalWindowLevel(
  pixelData: Uint8Array | Int16Array,
  bitsStored: number = 16
): { windowCenter: number; windowWidth: number } {
  let min = Number.MAX_VALUE;
  let max = Number.MIN_VALUE;
  
  for (let i = 0; i < pixelData.length; i++) {
    const value = pixelData[i];
    if (value < min) min = value;
    if (value > max) max = value;
  }
  
  const windowCenter = (min + max) / 2;
  const windowWidth = max - min;
  
  return { windowCenter, windowWidth };
}

/**
 * Convert DICOM date string to JavaScript Date
 * @param dicomDate DICOM date string (YYYYMMDD)
 * @returns JavaScript Date object or null if invalid
 */
export function parseDicomDate(dicomDate: string): Date | null {
  if (!dicomDate || dicomDate.length !== 8) return null;
  
  const year = parseInt(dicomDate.substring(0, 4), 10);
  const month = parseInt(dicomDate.substring(4, 6), 10) - 1; // Month is 0-indexed
  const day = parseInt(dicomDate.substring(6, 8), 10);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  
  return new Date(year, month, day);
}

/**
 * Convert DICOM time string to time object
 * @param dicomTime DICOM time string (HHMMSS.FFFFFF)
 * @returns Time object or null if invalid
 */
export function parseDicomTime(dicomTime: string): {
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
} | null {
  if (!dicomTime) return null;
  
  const match = dicomTime.match(/^(\d{2})(\d{2})(\d{2})(?:\.(\d+))?$/);
  if (!match) return null;
  
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  const fractional = match[4] || '0';
  const milliseconds = parseInt(fractional.padEnd(3, '0').substring(0, 3), 10);
  
  return { hours, minutes, seconds, milliseconds };
}

/**
 * Validate DICOM UID format
 * @param uid UID string to validate
 * @returns True if valid UID format
 */
export function isValidDicomUID(uid: string): boolean {
  // DICOM UID format: numbers and dots, max 64 characters
  const uidRegex = /^[0-9.]{1,64}$/;
  return uidRegex.test(uid) && !uid.startsWith('.') && !uid.endsWith('.');
}

/**
 * Deep clone an object (utility for immutable operations)
 * @param obj Object to clone
 * @returns Deep cloned object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  return obj;
}