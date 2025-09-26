import { ViewportType, VolumeViewportOptions } from '../types/viewport';
import { EventEmitter } from '../events/EventEmitter';
import * as THREE from 'three';

export class VolumeViewport extends EventEmitter {
  private element: HTMLElement;
  private options: VolumeViewportOptions;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private volumeMesh: THREE.Mesh | null = null;
  private isEnabled: boolean = true;

  constructor(element: HTMLElement, options: VolumeViewportOptions) {
    super();
    this.element = element;
    this.options = options;
    this.setupScene();
    this.setupCamera();
    this.setupRenderer();
    this.bindEvents();
    this.createVolume();
  }

  private setupScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
  }

  private setupCamera(): void {
    const { width, height } = this.element.getBoundingClientRect();
    this.camera = new THREE.PerspectiveCamera(
      45,
      width / height,
      0.1,
      1000
    );
    this.camera.position.z = 400;
  }

  private setupRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(
      this.element.clientWidth,
      this.element.clientHeight
    );
    this.element.appendChild(this.renderer.domElement);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleResize(): void {
    const { width, height } = this.element.getBoundingClientRect();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private async createVolume(): Promise<void> {
    // Create 3D texture from volume data
    const volumeTexture = await this.loadVolumeTexture();
    if (!volumeTexture) return;

    // Create custom shader material for volume rendering
    const material = new THREE.ShaderMaterial({
      uniforms: {
        volume: { value: volumeTexture },
        transferFunction: { 
          value: this.createTransferFunction() 
        },
        windowWidth: { 
          value: this.options.transferFunction.windowWidth 
        },
        windowCenter: { 
          value: this.options.transferFunction.windowCenter 
        }
      },
      vertexShader: this.getVertexShader(),
      fragmentShader: this.getFragmentShader(),
      transparent: true
    });

    // Create volume geometry
    const geometry = new THREE.BoxGeometry(100, 100, 100);
    this.volumeMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.volumeMesh);

    this.updateOrientation();
    this.render();
  }

  private async loadVolumeTexture(): Promise<THREE.DataTexture3D | null> {
    try {
      // Load volume data (implementation depends on your data format)
      const volumeData = await this.loadVolumeData(this.options.volumeId);
      
      return new THREE.DataTexture3D(
        volumeData.data,
        volumeData.width,
        volumeData.height,
        volumeData.depth,
        THREE.RedFormat,
        THREE.FloatType
      );
    } catch (error) {
      console.error('Failed to load volume data:', error);
      return null;
    }
  }

  private async loadVolumeData(volumeId: string): Promise<any> {
    // Implement volume data loading based on your data format
    throw new Error('loadVolumeData must be implemented');
  }

  private createTransferFunction(): THREE.DataTexture {
    const { opacity, color } = this.options.transferFunction;
    const size = 256;
    const data = new Float32Array(size * 4);

    for (let i = 0; i < size; i++) {
      const t = i / (size - 1);
      const colorIndex = Math.floor(t * (color.length - 1));
      const [r, g, b] = color[colorIndex];
      
      data[i * 4] = r;
      data[i * 4 + 1] = g;
      data[i * 4 + 2] = b;
      data[i * 4 + 3] = opacity[Math.floor(t * (opacity.length - 1))];
    }

    return new THREE.DataTexture(
      data,
      size,
      1,
      THREE.RGBAFormat,
      THREE.FloatType
    );
  }

  private updateOrientation(): void {
    if (!this.volumeMesh) return;

    const { sagittal, coronal, axial } = this.options.orientation;
    this.volumeMesh.rotation.set(
      axial ? Math.PI / 2 : 0,
      sagittal ? Math.PI / 2 : 0,
      coronal ? Math.PI / 2 : 0
    );
  }

  private getVertexShader(): string {
    return `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
  }

  private getFragmentShader(): string {
    return `
      uniform sampler3D volume;
      uniform sampler2D transferFunction;
      uniform float windowWidth;
      uniform float windowCenter;
      varying vec3 vPos;

      void main() {
        vec3 pos = vPos * 0.5 + 0.5;
        float value = texture(volume, pos).r;
        
        // Apply window/level
        value = (value - windowCenter) / windowWidth + 0.5;
        value = clamp(value, 0.0, 1.0);
        
        // Apply transfer function
        vec4 color = texture(transferFunction, vec2(value, 0.5));
        
        gl_FragColor = color;
      }
    `;
  }

  render(): void {
    if (!this.isEnabled) return;
    this.renderer.render(this.scene, this.camera);
    this.emit('rendered');
  }

  setOptions(options: Partial<VolumeViewportOptions>): void {
    this.options = { ...this.options, ...options };
    this.updateOrientation();
    if (this.volumeMesh) {
      const material = this.volumeMesh.material as THREE.ShaderMaterial;
      material.uniforms.transferFunction.value = this.createTransferFunction();
      material.uniforms.windowWidth.value = this.options.transferFunction.windowWidth;
      material.uniforms.windowCenter.value = this.options.transferFunction.windowCenter;
    }
    this.render();
  }

  enable(): void {
    this.isEnabled = true;
    this.render();
  }

  disable(): void {
    this.isEnabled = false;
  }

  destroy(): void {
    window.removeEventListener('resize', this.handleResize.bind(this));
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}