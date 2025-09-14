/**
 * Core types and interfaces for DICOM viewer
 */

// DICOM Image types
export interface DicomImage {
  imageId: string;
  width: number;
  height: number;
  pixelData: ArrayBuffer | Uint8Array | Int16Array;
  windowCenter?: number;
  windowWidth?: number;
  rescaleSlope?: number;
  rescaleIntercept?: number;
  photometricInterpretation?: string;
  samplesPerPixel?: number;
  bitsAllocated?: number;
  bitsStored?: number;
  highBit?: number;
  pixelRepresentation?: number;
}

// DICOM Metadata
export interface DicomMetadata {
  studyInstanceUID: string;
  seriesInstanceUID: string;
  sopInstanceUID: string;
  patientName?: string;
  patientID?: string;
  studyDate?: string;
  modality?: string;
  instanceNumber?: number;
  sliceLocation?: number;
  imagePosition?: [number, number, number];
  imageOrientation?: [number, number, number, number, number, number];
  pixelSpacing?: [number, number];
  sliceThickness?: number;
}

// Viewport types
export interface Viewport {
  scale: number;
  translation: {
    x: number;
    y: number;
  };
  voi: {
    windowWidth: number;
    windowCenter: number;
  };
  invert: boolean;
  pixelReplication: boolean;
  rotation: number;
  hflip: boolean;
  vflip: boolean;
}

// Tool types
export type ToolType = 
  | 'wwwc' // Window/Level
  | 'zoom'
  | 'pan'
  | 'length'
  | 'angle'
  | 'rectangle'
  | 'ellipse'
  | 'freehand'
  | 'probe';

export interface Tool {
  name: string;
  type: ToolType;
  active: boolean;
  configuration?: Record<string, any>;
}

// Event types
export interface DicomEvent {
  type: string;
  detail?: any;
  element?: HTMLElement;
  viewport?: Viewport;
  image?: DicomImage;
}

// Error types
export class DicomError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DicomError';
  }
}

// Loading states
export type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

export interface ImageLoadingState {
  imageId: string;
  state: LoadingState;
  progress?: number;
  error?: DicomError;
}