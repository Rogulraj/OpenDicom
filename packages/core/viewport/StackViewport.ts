import { ViewportType, StackViewportOptions } from '../types/viewport';
import { ImageLoader } from '../image-loader/ImageLoader';
import { EventEmitter } from '../events/EventEmitter';

export class StackViewport extends EventEmitter {
  private element: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: StackViewportOptions;
  private imageLoader: ImageLoader;
  private isEnabled: boolean = true;

  constructor(element: HTMLElement, options: StackViewportOptions) {
    super();
    this.element = element;
    this.options = options;
    this.imageLoader = new ImageLoader();
    this.setupCanvas();
    this.bindEvents();
  }

  private setupCanvas(): void {
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.element.appendChild(this.canvas);
    
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    
    this.resizeCanvas();
  }

  private resizeCanvas(): void {
    const { width, height } = this.element.getBoundingClientRect();
    this.canvas.width = width * window.devicePixelRatio;
    this.canvas.height = height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.resizeCanvas.bind(this));
    this.canvas.addEventListener('wheel', this.handleScroll.bind(this));
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }

  private handleScroll(event: WheelEvent): void {
    if (!this.isEnabled) return;
    event.preventDefault();
    
    const delta = Math.sign(event.deltaY);
    const newIndex = this.options.currentImageIndex + delta;
    
    if (newIndex >= 0 && newIndex < this.options.imageIds.length) {
      this.options.currentImageIndex = newIndex;
      this.render();
      this.emit('stackScroll', { imageIndex: newIndex });
    }
  }

  private handleMouseDown(event: MouseEvent): void {
    if (!this.isEnabled) return;
    // Implement window/level adjustment on drag
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isEnabled) return;
    // Implement window/level adjustment
  }

  private handleMouseUp(event: MouseEvent): void {
    if (!this.isEnabled) return;
    // Cleanup after window/level adjustment
  }

  async render(): Promise<void> {
    if (!this.isEnabled) return;

    const imageId = this.options.imageIds[this.options.currentImageIndex];
    const image = await this.imageLoader.loadImage(imageId);

    this.ctx.save();
    
    // Apply transformations
    if (this.options.rotation) {
      this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
      this.ctx.rotate((this.options.rotation * Math.PI) / 180);
      this.ctx.translate(-this.canvas.width / 2, -this.canvas.height / 2);
    }

    if (this.options.flip.horizontal || this.options.flip.vertical) {
      this.ctx.translate(
        this.options.flip.horizontal ? this.canvas.width : 0,
        this.options.flip.vertical ? this.canvas.height : 0
      );
      this.ctx.scale(
        this.options.flip.horizontal ? -1 : 1,
        this.options.flip.vertical ? -1 : 1
      );
    }

    // Apply window/level
    const pixelData = this.applyWindowLevel(
      image.getPixelData(),
      this.options.windowWidth,
      this.options.windowCenter
    );

    // Draw the image
    const imageData = new ImageData(
      new Uint8ClampedArray(pixelData),
      image.width,
      image.height
    );
    this.ctx.putImageData(imageData, 0, 0);

    this.ctx.restore();
    this.emit('rendered');
  }

  private applyWindowLevel(
    pixelData: Int16Array,
    windowWidth: number,
    windowCenter: number
  ): Uint8ClampedArray {
    const slope = 255 / windowWidth;
    const intercept = 128 - (slope * windowCenter);
    
    return new Uint8ClampedArray(
      pixelData.map(pixel => {
        const intensity = pixel * slope + intercept;
        return Math.max(0, Math.min(255, intensity));
      })
    );
  }

  setOptions(options: Partial<StackViewportOptions>): void {
    this.options = { ...this.options, ...options };
    this.render();
  }

  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }

  destroy(): void {
    window.removeEventListener('resize', this.resizeCanvas.bind(this));
    this.canvas.remove();
  }
}