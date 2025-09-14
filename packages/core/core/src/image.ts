/**
 * Image processing utilities for DICOM images
 */

import { DicomImage, Viewport } from './types';

/**
 * Apply window/level transformation to pixel data
 * @param pixelData Input pixel data
 * @param windowCenter Window center value
 * @param windowWidth Window width value
 * @param rescaleSlope Rescale slope (default: 1)
 * @param rescaleIntercept Rescale intercept (default: 0)
 * @returns Transformed pixel data (0-255 range)
 */
export function applyWindowLevel(
  pixelData: Uint8Array | Int16Array,
  windowCenter: number,
  windowWidth: number,
  rescaleSlope: number = 1,
  rescaleIntercept: number = 0
): Uint8Array {
  const output = new Uint8Array(pixelData.length);
  const windowMin = windowCenter - windowWidth / 2;
  const windowMax = windowCenter + windowWidth / 2;
  
  for (let i = 0; i < pixelData.length; i++) {
    // Apply rescale transformation
    let value = pixelData[i] * rescaleSlope + rescaleIntercept;
    
    // Apply window/level
    if (value <= windowMin) {
      output[i] = 0;
    } else if (value >= windowMax) {
      output[i] = 255;
    } else {
      output[i] = Math.round(((value - windowMin) / windowWidth) * 255);
    }
  }
  
  return output;
}

/**
 * Convert pixel data to ImageData for canvas rendering
 * @param pixelData Processed pixel data (0-255 range)
 * @param width Image width
 * @param height Image height
 * @param invert Whether to invert the image
 * @returns ImageData object
 */
export function createImageData(
  pixelData: Uint8Array,
  width: number,
  height: number,
  invert: boolean = false
): ImageData {
  const imageData = new ImageData(width, height);
  const data = imageData.data;
  
  for (let i = 0; i < pixelData.length; i++) {
    const value = invert ? 255 - pixelData[i] : pixelData[i];
    const index = i * 4;
    
    // Set RGB values (grayscale)
    data[index] = value;     // Red
    data[index + 1] = value; // Green
    data[index + 2] = value; // Blue
    data[index + 3] = 255;   // Alpha
  }
  
  return imageData;
}

/**
 * Apply zoom transformation to coordinates
 * @param x X coordinate
 * @param y Y coordinate
 * @param scale Zoom scale factor
 * @param centerX Center X for zoom
 * @param centerY Center Y for zoom
 * @returns Transformed coordinates
 */
export function applyZoom(
  x: number,
  y: number,
  scale: number,
  centerX: number,
  centerY: number
): { x: number; y: number } {
  return {
    x: (x - centerX) * scale + centerX,
    y: (y - centerY) * scale + centerY,
  };
}

/**
 * Apply rotation transformation to coordinates
 * @param x X coordinate
 * @param y Y coordinate
 * @param angle Rotation angle in radians
 * @param centerX Center X for rotation
 * @param centerY Center Y for rotation
 * @returns Transformed coordinates
 */
export function applyRotation(
  x: number,
  y: number,
  angle: number,
  centerX: number,
  centerY: number
): { x: number; y: number } {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = x - centerX;
  const dy = y - centerY;
  
  return {
    x: dx * cos - dy * sin + centerX,
    y: dx * sin + dy * cos + centerY,
  };
}

/**
 * Calculate the bounding box of an image after transformations
 * @param width Original image width
 * @param height Original image height
 * @param viewport Viewport transformations
 * @returns Bounding box coordinates
 */
export function calculateBoundingBox(
  width: number,
  height: number,
  viewport: Viewport
): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Define corner points
  const corners = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];
  
  // Apply transformations to each corner
  const transformedCorners = corners.map(corner => {
    let { x, y } = corner;
    
    // Apply flip transformations
    if (viewport.hflip) {
      x = width - x;
    }
    if (viewport.vflip) {
      y = height - y;
    }
    
    // Apply rotation
    const rotated = applyRotation(x, y, viewport.rotation, centerX, centerY);
    
    // Apply scale
    const scaled = applyZoom(
      rotated.x,
      rotated.y,
      viewport.scale,
      centerX,
      centerY
    );
    
    // Apply translation
    return {
      x: scaled.x + viewport.translation.x,
      y: scaled.y + viewport.translation.y,
    };
  });
  
  // Find bounding box
  const xs = transformedCorners.map(p => p.x);
  const ys = transformedCorners.map(p => p.y);
  
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Resize image data using nearest neighbor interpolation
 * @param imageData Original image data
 * @param newWidth Target width
 * @param newHeight Target height
 * @returns Resized image data
 */
export function resizeImageData(
  imageData: ImageData,
  newWidth: number,
  newHeight: number
): ImageData {
  const { width: oldWidth, height: oldHeight, data: oldData } = imageData;
  const newImageData = new ImageData(newWidth, newHeight);
  const newData = newImageData.data;
  
  const scaleX = oldWidth / newWidth;
  const scaleY = oldHeight / newHeight;
  
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const oldX = Math.floor(x * scaleX);
      const oldY = Math.floor(y * scaleY);
      
      const oldIndex = (oldY * oldWidth + oldX) * 4;
      const newIndex = (y * newWidth + x) * 4;
      
      newData[newIndex] = oldData[oldIndex];         // Red
      newData[newIndex + 1] = oldData[oldIndex + 1]; // Green
      newData[newIndex + 2] = oldData[oldIndex + 2]; // Blue
      newData[newIndex + 3] = oldData[oldIndex + 3]; // Alpha
    }
  }
  
  return newImageData;
}