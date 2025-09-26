export enum ViewportType {
  STACK = 'stack',
  VOLUME = 'volume'
}

export interface ViewportLayout {
  rows: number;
  cols: number;
}

export interface Viewport {
  id: string;
  type: ViewportType;
  options: any;
  element: HTMLElement | null;
}

export interface SyncGroup {
  id: string;
  viewportIds: string[];
}

export interface StackViewportOptions {
  imageIds: string[];
  currentImageIndex: number;
  windowWidth: number;
  windowCenter: number;
  rotation: number;
  flip: {
    horizontal: boolean;
    vertical: boolean;
  };
}

export interface VolumeViewportOptions {
  volumeId: string;
  orientation: {
    sagittal: boolean;
    coronal: boolean;
    axial: boolean;
  };
  renderingMode: 'mip' | 'minip' | 'average' | 'surface';
  transferFunction: {
    windowWidth: number;
    windowCenter: number;
    opacity: number[];
    color: Array<[number, number, number]>;
  };
}