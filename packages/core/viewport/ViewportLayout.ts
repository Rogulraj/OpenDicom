import { ViewportManager } from './ViewportManager';
import { ViewportType, ViewportLayout as LayoutConfig } from '../types/viewport';

export class ViewportLayout {
  private container: HTMLElement;
  private viewportManager: ViewportManager;
  private viewportElements: Map<string, HTMLElement> = new Map();
  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement) {
    this.container = container;
    this.viewportManager = ViewportManager.getInstance();
    this.setupContainer();
    this.setupResizeObserver();
    this.subscribeToLayoutChanges();
  }

  private setupContainer(): void {
    this.container.style.display = 'grid';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.gap = '2px';
    this.container.style.backgroundColor = '#1a1a1a';
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.viewportElements.forEach((element, id) => {
        const viewport = this.viewportManager.getViewport(id);
        if (viewport) {
          viewport.resize();
        }
      });
    });
    this.resizeObserver.observe(this.container);
  }

  private subscribeToLayoutChanges(): void {
    this.viewportManager.subscribe((state) => {
      this.updateLayout(state.layout);
    });
  }

  private updateLayout(layout: LayoutConfig): void {
    const { rows, cols } = layout;
    
    // Update grid layout
    this.container.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    this.container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    // Clear existing viewport elements
    this.viewportElements.forEach(element => element.remove());
    this.viewportElements.clear();

    // Create viewport elements based on layout
    const totalViewports = rows * cols;
    for (let i = 0; i < totalViewports; i++) {
      const viewportElement = document.createElement('div');
      viewportElement.className = 'viewport-container';
      viewportElement.style.width = '100%';
      viewportElement.style.height = '100%';
      viewportElement.style.backgroundColor = '#000';
      viewportElement.style.position = 'relative';
      
      this.container.appendChild(viewportElement);
      
      // Create viewport instance
      const viewportId = this.viewportManager.createViewport(
        i === 0 ? ViewportType.STACK : ViewportType.VOLUME
      );
      this.viewportElements.set(viewportId, viewportElement);
    }

    // Set up synchronization for viewports in the same row/column
    this.setupViewportSynchronization(layout);
  }

  private setupViewportSynchronization(layout: LayoutConfig): void {
    const { rows, cols } = layout;
    
    // Synchronize viewports in the same row
    for (let row = 0; row < rows; row++) {
      const rowViewports: string[] = [];
      for (let col = 0; col < cols; col++) {
        const index = row * cols + col;
        const viewportId = Array.from(this.viewportElements.keys())[index];
        if (viewportId) {
          rowViewports.push(viewportId);
        }
      }
      if (rowViewports.length > 1) {
        this.viewportManager.createSyncGroup(`row-${row}`, rowViewports);
      }
    }

    // Synchronize viewports in the same column
    for (let col = 0; col < cols; col++) {
      const colViewports: string[] = [];
      for (let row = 0; row < rows; row++) {
        const index = row * cols + col;
        const viewportId = Array.from(this.viewportElements.keys())[index];
        if (viewportId) {
          colViewports.push(viewportId);
        }
      }
      if (colViewports.length > 1) {
        this.viewportManager.createSyncGroup(`col-${col}`, colViewports);
      }
    }
  }

  setLayout(rows: number, cols: number): void {
    this.viewportManager.setViewportLayout(rows, cols);
  }

  destroy(): void {
    this.resizeObserver.disconnect();
    this.viewportElements.forEach((element, id) => {
      const viewport = this.viewportManager.getViewport(id);
      if (viewport) {
        viewport.destroy();
      }
      element.remove();
    });
    this.viewportElements.clear();
  }
}