/**
 * Jest Setup for OpenDICOM Medical Imaging Tests
 * Configures testing environment with medical imaging utilities
 */

import '@testing-library/jest-dom';
import 'jest-canvas-mock';

// Mock Web APIs not available in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserver;

// Mock IntersectionObserver
class IntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
  }
  
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.IntersectionObserver = IntersectionObserver;

// Mock WebGL context for medical imaging
HTMLCanvasElement.prototype.getContext = jest.fn((contextType) => {
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return {
      canvas: {},
      drawingBufferWidth: 1024,
      drawingBufferHeight: 1024,
      getParameter: jest.fn(),
      getExtension: jest.fn(),
      createShader: jest.fn(),
      shaderSource: jest.fn(),
      compileShader: jest.fn(),
      createProgram: jest.fn(),
      attachShader: jest.fn(),
      linkProgram: jest.fn(),
      useProgram: jest.fn(),
      createBuffer: jest.fn(),
      bindBuffer: jest.fn(),
      bufferData: jest.fn(),
      createTexture: jest.fn(),
      bindTexture: jest.fn(),
      texImage2D: jest.fn(),
      texParameteri: jest.fn(),
      viewport: jest.fn(),
      clear: jest.fn(),
      clearColor: jest.fn(),
      enable: jest.fn(),
      disable: jest.fn(),
      drawArrays: jest.fn(),
      drawElements: jest.fn(),
      // Medical imaging specific mocks
      readPixels: jest.fn(),
      getUniformLocation: jest.fn(),
      uniform1f: jest.fn(),
      uniform2f: jest.fn(),
      uniform3f: jest.fn(),
      uniform4f: jest.fn(),
      uniformMatrix4fv: jest.fn()
    };
  }
  
  if (contextType === '2d') {
    return {
      canvas: {},
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(4),
        width: 1,
        height: 1
      })),
      putImageData: jest.fn(),
      createImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(4),
        width: 1,
        height: 1
      })),
      setTransform: jest.fn(),
      drawImage: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      measureText: jest.fn(() => ({ width: 0 })),
      transform: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      rotate: jest.fn(),
      arc: jest.fn(),
      fillText: jest.fn(),
      strokeText: jest.fn()
    };
  }
  
  return null;
});

// Mock File API for DICOM file testing
class MockFile {
  constructor(data, name, options = {}) {
    this.data = data;
    this.name = name;
    this.size = data.length || data.byteLength || 0;
    this.type = options.type || 'application/dicom';
    this.lastModified = options.lastModified || Date.now();
  }
  
  arrayBuffer() {
    return Promise.resolve(this.data instanceof ArrayBuffer ? this.data : new ArrayBuffer(0));
  }
  
  text() {
    return Promise.resolve(typeof this.data === 'string' ? this.data : '');
  }
  
  stream() {
    return new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(this.data));
        controller.close();
      }
    });
  }
}

global.File = MockFile;

// Mock FileReader for DICOM file reading
class MockFileReader {
  constructor() {
    this.readyState = 0;
    this.result = null;
    this.error = null;
    this.onload = null;
    this.onerror = null;
    this.onabort = null;
    this.onloadstart = null;
    this.onloadend = null;
    this.onprogress = null;
  }
  
  readAsArrayBuffer(file) {
    setTimeout(() => {
      this.readyState = 2;
      this.result = file.data instanceof ArrayBuffer ? file.data : new ArrayBuffer(0);
      if (this.onload) this.onload({ target: this });
      if (this.onloadend) this.onloadend({ target: this });
    }, 0);
  }
  
  readAsText(file) {
    setTimeout(() => {
      this.readyState = 2;
      this.result = typeof file.data === 'string' ? file.data : '';
      if (this.onload) this.onload({ target: this });
      if (this.onloadend) this.onloadend({ target: this });
    }, 0);
  }
  
  abort() {
    this.readyState = 2;
    if (this.onabort) this.onabort({ target: this });
  }
}

global.FileReader = MockFileReader;

// Mock URL.createObjectURL for blob handling
URL.createObjectURL = jest.fn(() => 'mock-object-url');
URL.revokeObjectURL = jest.fn();

// Mock performance API for medical imaging performance tests
if (!global.performance) {
  global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn()
  };
}

// Mock Worker for background DICOM processing
class MockWorker {
  constructor(url) {
    this.url = url;
    this.onmessage = null;
    this.onerror = null;
  }
  
  postMessage(data) {
    // Simulate async worker response
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({ data: { type: 'success', result: data } });
      }
    }, 0);
  }
  
  terminate() {
    // Mock termination
  }
}

global.Worker = MockWorker;

// Mock SharedArrayBuffer for large DICOM data
if (!global.SharedArrayBuffer) {
  global.SharedArrayBuffer = ArrayBuffer;
}

// Mock ImageData for pixel manipulation
if (!global.ImageData) {
  global.ImageData = class ImageData {
    constructor(data, width, height) {
      this.data = data;
      this.width = width;
      this.height = height || data.length / (width * 4);
    }
  };
}

// Console warnings for medical imaging specific issues
const originalWarn = console.warn;
console.warn = (...args) => {
  // Suppress known warnings in test environment
  const message = args[0];
  if (
    typeof message === 'string' &&
    (
      message.includes('WebGL') ||
      message.includes('Canvas') ||
      message.includes('ResizeObserver') ||
      message.includes('IntersectionObserver')
    )
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

// Global test utilities for medical imaging
global.testUtils = {
  // Create mock DICOM data
  createMockDicomData: (options = {}) => {
    const {
      width = 512,
      height = 512,
      frames = 1,
      bitsAllocated = 16,
      modality = 'CT'
    } = options;
    
    const pixelDataSize = width * height * frames * (bitsAllocated / 8);
    const pixelData = new ArrayBuffer(pixelDataSize);
    
    return {
      width,
      height,
      frames,
      bitsAllocated,
      modality,
      pixelData,
      metadata: {
        patientName: 'Test^Patient',
        studyDate: '20240101',
        seriesDescription: 'Test Series',
        instanceNumber: 1
      }
    };
  },
  
  // Create mock viewport
  createMockViewport: (options = {}) => {
    const {
      width = 512,
      height = 512,
      scale = 1,
      translation = { x: 0, y: 0 }
    } = options;
    
    return {
      width,
      height,
      scale,
      translation,
      canvas: document.createElement('canvas'),
      context: null
    };
  },
  
  // Performance testing utilities
  measurePerformance: async (fn, expectedThreshold = 1000) => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    const duration = end - start;
    
    expect(duration).toBeLessThan(expectedThreshold);
    
    return {
      result,
      duration,
      withinThreshold: duration < expectedThreshold
    };
  },
  
  // Memory usage testing
  checkMemoryUsage: () => {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  }
};

// Set up fake timers for animation testing
jest.useFakeTimers();

// Increase timeout for large DICOM file tests
jest.setTimeout(30000);