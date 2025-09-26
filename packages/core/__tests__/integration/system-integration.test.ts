import { ViewportManager } from '../../viewport/ViewportManager';
import { StackViewport } from '../../viewport/StackViewport';
import { VolumeViewport } from '../../viewport/VolumeViewport';
import { DicomImageLoader } from '../../image-loader/DicomImageLoader';
import { ImageCache } from '../../image-loader/ImageCache';
import { DicomWebClient } from '../../image-loader/DicomWebClient';
import { ImagePrefetcher } from '../../image-loader/ImagePrefetcher';
import { VirtualScroller } from '../../viewport/VirtualScroller';
import { MemoryManager } from '../../memory/MemoryManager';
import { ProgressiveLoader } from '../../image-loader/ProgressiveLoader';
import { PerformanceMonitor } from '../../monitoring/PerformanceMonitor';
import { ViewportSyncManager } from '../../viewport/ViewportSyncManager';
import { MprReferenceLine } from '../../viewport/MprReferenceLine';
import { HangingProtocolEngine } from '../../viewport/HangingProtocolEngine';
import { CrosshairManager } from '../../viewport/CrosshairManager';

describe('System Integration Tests', () => {
  let viewportManager: ViewportManager;
  let imageLoader: DicomImageLoader;
  let imageCache: ImageCache;
  let virtualScroller: VirtualScroller;
  let memoryManager: MemoryManager;
  let progressiveLoader: ProgressiveLoader;
  let performanceMonitor: PerformanceMonitor;
  let viewportSyncManager: ViewportSyncManager;
  let mprReferenceLine: MprReferenceLine;
  let hangingProtocolEngine: HangingProtocolEngine;
  let crosshairManager: CrosshairManager;

  beforeEach(() => {
    // Initialize core components
    imageCache = new ImageCache({ maxSize: 1024 * 1024 * 100 }); // 100MB cache
    imageLoader = new DicomImageLoader();
    viewportManager = new ViewportManager();
    viewportSyncManager = new ViewportSyncManager(viewportManager);
    
    // Initialize performance components
    virtualScroller = new VirtualScroller(100, imageLoader, imageCache);
    memoryManager = new MemoryManager(imageCache);
    progressiveLoader = new ProgressiveLoader(imageLoader);
    performanceMonitor = new PerformanceMonitor();
    
    // Initialize advanced viewport features
    mprReferenceLine = new MprReferenceLine();
    hangingProtocolEngine = new HangingProtocolEngine();
    crosshairManager = new CrosshairManager(viewportManager, viewportSyncManager);
  });

  afterEach(() => {
    // Cleanup
    viewportManager.destroy();
    virtualScroller.destroy();
    memoryManager.destroy();
    progressiveLoader.destroy();
    performanceMonitor.destroy();
    viewportSyncManager.destroy();
    crosshairManager.destroy();
  });

  test('Viewport Architecture Components', async () => {
    // Test StackViewport creation and management
    const stackViewport = await viewportManager.createViewport('stack', {
      id: 'stack-1',
      element: document.createElement('div')
    });
    expect(stackViewport).toBeInstanceOf(StackViewport);
    expect(viewportManager.getViewport('stack-1')).toBe(stackViewport);

    // Test VolumeViewport creation and management
    const volumeViewport = await viewportManager.createViewport('volume', {
      id: 'volume-1',
      element: document.createElement('div')
    });
    expect(volumeViewport).toBeInstanceOf(VolumeViewport);
    expect(viewportManager.getViewport('volume-1')).toBe(volumeViewport);
  });

  test('DICOM Image Loading & Caching System', async () => {
    // Test image loading
    const imageId = 'test-image-1';
    await imageLoader.loadImage(imageId);
    expect(imageCache.has(imageId)).toBe(true);

    // Test LRU eviction
    for (let i = 0; i < 200; i++) {
      await imageLoader.loadImage(`test-image-${i}`);
    }
    expect(imageCache.has(imageId)).toBe(false); // Should be evicted

    // Test progressive loading
    const progressiveImage = await progressiveLoader.loadImage('progressive-1');
    expect(progressiveImage).toBeDefined();
  });

  test('Advanced Viewport Features', async () => {
    // Test viewport synchronization
    const viewport1 = await viewportManager.createViewport('stack', {
      id: 'sync-1',
      element: document.createElement('div')
    });
    const viewport2 = await viewportManager.createViewport('stack', {
      id: 'sync-2',
      element: document.createElement('div')
    });

    viewportSyncManager.addToSyncGroup('group1', 'sync-1');
    viewportSyncManager.addToSyncGroup('group1', 'sync-2');

    // Test MPR reference lines
    mprReferenceLine.addViewport(viewport1);
    mprReferenceLine.addViewport(viewport2);
    expect(mprReferenceLine.getViewports()).toHaveLength(2);

    // Test hanging protocols
    const protocol = {
      id: 'test-protocol',
      name: 'Test Protocol',
      viewports: [{
        position: { x: 0, y: 0 },
        type: 'stack'
      }]
    };
    hangingProtocolEngine.registerProtocol(protocol);
    expect(hangingProtocolEngine.getProtocol('test-protocol')).toBeDefined();

    // Test crosshair synchronization
    crosshairManager.setReferenceViewport('sync-1');
    crosshairManager.updateCrosshairPosition('sync-1', { x: 100, y: 100 });
    expect(crosshairManager.getCurrentPoint()).toBeDefined();
  });

  test('Performance Optimization', async () => {
    // Test virtual scrolling
    virtualScroller.scrollTo(50);
    expect(virtualScroller.getCurrentIndex()).toBe(50);
    expect(virtualScroller.getVisibleImages()).toHaveLength(5); // Default visible count

    // Test memory management
    const resource = {
      dispose: jest.fn(),
      lastUsed: Date.now(),
      size: 1024 * 1024, // 1MB
      priority: 1
    };
    memoryManager.registerDisposableResource('test-resource', resource);
    await memoryManager.performCleanup();
    expect(resource.dispose).toHaveBeenCalled();

    // Test performance monitoring
    performanceMonitor.startMonitoring();
    performanceMonitor.recordPerformanceMetric('test', 100);
    const summary = performanceMonitor.getMetricsSummary();
    expect(summary.performance.test).toBe(100);
  });

  test('System-wide Integration', async () => {
    // Test all components working together
    const viewport = await viewportManager.createViewport('stack', {
      id: 'integrated-1',
      element: document.createElement('div')
    });

    // Setup monitoring
    performanceMonitor.startMonitoring();

    // Load and display image
    await imageLoader.loadImage('test-integrated-1');
    await viewport.setImage('test-integrated-1');

    // Test synchronization
    viewportSyncManager.addToSyncGroup('integrated-group', 'integrated-1');
    
    // Test memory management during operations
    await memoryManager.performCleanup();

    // Verify system state
    expect(viewport.getImage()).toBeDefined();
    expect(imageCache.has('test-integrated-1')).toBe(true);
    expect(performanceMonitor.getMetricsSummary()).toBeDefined();

    // Test cleanup
    viewportManager.destroyViewport('integrated-1');
    expect(viewportManager.getViewport('integrated-1')).toBeUndefined();
  });
});