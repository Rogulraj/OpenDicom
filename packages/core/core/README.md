# @opendicom/core

The core package of the OpenDICOM viewer, providing a robust, extensible architecture for building DICOM viewing applications.

## Features

### 🔌 Plugin System
- **Extensible Architecture**: Register and manage plugins with lifecycle hooks
- **Dependency Management**: Automatic plugin dependency resolution
- **Permission System**: Fine-grained access control for plugins
- **Hot Reloading**: Dynamic plugin activation/deactivation

### 📡 Event System
- **Type-Safe Events**: Strongly typed event system with TypeScript
- **Priority Handling**: Event listeners with priority levels
- **Event History**: Built-in event history and replay capabilities
- **Async Support**: Full support for asynchronous event handlers

### 🏪 State Management
- **Zustand Integration**: Lightweight, performant state management
- **Immutable Updates**: Built-in Immer integration for safe state updates
- **Persistent Storage**: Automatic state persistence and hydration
- **DevTools Support**: Redux DevTools integration for debugging

### 🛠️ Service Container
- **Dependency Injection**: IoC container for service management
- **Lifecycle Management**: Singleton and transient service lifetimes
- **Interface-Based**: Type-safe service resolution
- **Circular Dependency Detection**: Automatic detection and prevention

### ⚙️ Configuration Management
- **Schema Validation**: Zod-based configuration validation
- **Hot Reloading**: Runtime configuration updates
- **Environment Support**: Multi-environment configuration
- **Watchers**: React to configuration changes

### 📊 Logging & Monitoring
- **Multi-Transport Logging**: Console, remote, and memory transports
- **Performance Monitoring**: Built-in performance tracking
- **Error Handling**: Comprehensive error management
- **Structured Logging**: JSON-structured log entries

## Installation

```bash
npm install @opendicom/core
```

## Quick Start

```typescript
import { dicomViewerCore, DicomViewerConfig } from '@opendicom/core';

// Initialize with custom configuration
const config: Partial<DicomViewerConfig> = {
  viewport: {
    defaultTool: 'zoom',
    enableAnnotations: true
  },
  logging: {
    level: 'info',
    enableConsole: true
  }
};

// Initialize the core
await dicomViewerCore.initialize(config);

console.log('DICOM Viewer initialized!');
```

## Architecture Overview

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    DicomViewerCore                          │
├─────────────────────────────────────────────────────────────┤
│  PluginManager  │  EventHub  │  ServiceContainer  │ Config  │
├─────────────────────────────────────────────────────────────┤
│     Logger      │   Stores   │   ErrorHandler     │ Monitor │
└─────────────────────────────────────────────────────────────┘
```

### Plugin Development

```typescript
import { BasePlugin, PluginMetadata } from '@opendicom/core';

class MyPlugin extends BasePlugin {
  constructor() {
    const metadata: PluginMetadata = {
      name: 'my-plugin',
      version: '1.0.0',
      description: 'My custom plugin',
      author: 'Your Name',
      dependencies: [],
      permissions: ['viewport:read', 'config:write']
    };
    
    super(metadata);
  }
  
  async onActivate(): Promise<void> {
    this.logger.info('Plugin activated');
    
    // Listen to events
    this.context.eventHub.on('viewport:changed', (data) => {
      this.logger.debug('Viewport changed:', data);
    });
  }
  
  async onDeactivate(): Promise<void> {
    this.logger.info('Plugin deactivated');
  }
}

// Register and activate
const plugin = new MyPlugin();
await dicomViewerCore.pluginManager.register(plugin);
await dicomViewerCore.pluginManager.activate('my-plugin');
```

### Event System Usage

```typescript
import { dicomViewerCore } from '@opendicom/core';

// Listen to events
dicomViewerCore.eventHub.on('image:loaded', (data) => {
  console.log('Image loaded:', data.imageId);
});

// Emit events
dicomViewerCore.eventHub.emit('image:loaded', {
  imageId: 'example://image1',
  metadata: { /* ... */ }
});

// Priority listeners
dicomViewerCore.eventHub.on('viewport:render', handler, { priority: 10 });
```

### State Management

```typescript
import { viewerConfigStore, viewportStore } from '@opendicom/core';

// Access viewer configuration
const config = viewerConfigStore.getState();
console.log('Current config:', config);

// Update configuration
viewerConfigStore.getState().updateConfig({
  enableWebGL: true,
  maxCacheSize: 1024
});

// Subscribe to changes
const unsubscribe = viewerConfigStore.subscribe((state) => {
  console.log('Config updated:', state);
});

// Viewport state management
const viewport = viewportStore.getState();
viewport.setZoom(2.0);
viewport.setPan({ x: 100, y: 50 });
```

### Service Container

```typescript
import { dicomViewerCore } from '@opendicom/core';

// Define service interface
interface IImageProcessor {
  processImage(imageData: ArrayBuffer): Promise<ProcessedImage>;
}

// Implement service
class ImageProcessor implements IImageProcessor {
  async processImage(imageData: ArrayBuffer): Promise<ProcessedImage> {
    // Implementation
    return processedImage;
  }
}

// Register service
dicomViewerCore.serviceContainer.register(
  'IImageProcessor',
  () => new ImageProcessor(),
  { singleton: true }
);

// Resolve and use service
const processor = dicomViewerCore.serviceContainer.resolve<IImageProcessor>('IImageProcessor');
const result = await processor.processImage(imageData);
```

### Configuration Management

```typescript
import { dicomViewerCore } from '@opendicom/core';

// Get configuration
const config = dicomViewerCore.configManager.getConfig();

// Update configuration
dicomViewerCore.configManager.updateConfig({
  viewport: {
    defaultTool: 'pan'
  }
});

// Watch for changes
dicomViewerCore.configManager.watch('viewport.defaultTool', (newTool) => {
  console.log('Default tool changed to:', newTool);
});

// Validate configuration
const isValid = dicomViewerCore.configManager.validateConfig(customConfig);
```

## API Reference

### DicomViewerCore

The main core instance providing access to all subsystems.

#### Methods

- `initialize(config?: Partial<DicomViewerConfig>): Promise<void>`
- `shutdown(): Promise<void>`
- `isInitialized(): boolean`
- `getSystemInfo(): SystemInfo`

#### Properties

- `pluginManager: PluginManager`
- `eventHub: EventHub`
- `serviceContainer: ServiceContainer`
- `configManager: ConfigManager`
- `logger: Logger`
- `errorHandler: ErrorHandler`
- `performanceMonitor: PerformanceMonitor`

### Plugin System

#### BasePlugin

Abstract base class for all plugins.

```typescript
abstract class BasePlugin implements Plugin {
  abstract onActivate(): Promise<void>;
  abstract onDeactivate(): Promise<void>;
  onConfigChange?(config: DicomViewerConfig): void;
  onError?(error: Error): void;
}
```

#### PluginManager

Manages plugin lifecycle and dependencies.

- `register(plugin: Plugin): Promise<void>`
- `unregister(name: string): Promise<void>`
- `activate(name: string): Promise<void>`
- `deactivate(name: string): Promise<void>`
- `getPlugin(name: string): Plugin | undefined`
- `getAllPlugins(): Plugin[]`
- `getActivePlugins(): Plugin[]`

### Event System

#### EventHub

Central event management system.

- `on<K extends keyof DicomViewerEvents>(event: K, handler: EventHandler<K>, options?: EventOptions): void`
- `off<K extends keyof DicomViewerEvents>(event: K, handler: EventHandler<K>): void`
- `emit<K extends keyof DicomViewerEvents>(event: K, data: DicomViewerEvents[K]): void`
- `once<K extends keyof DicomViewerEvents>(event: K, handler: EventHandler<K>): void`
- `removeAllListeners(event?: keyof DicomViewerEvents): void`

## Configuration Schema

The configuration system uses Zod schemas for validation:

```typescript
interface DicomViewerConfig {
  viewport: {
    defaultTool: string;
    enableAnnotations: boolean;
    backgroundColor: string;
    // ...
  };
  tools: {
    enabledTools: string[];
    defaultBindings: Record<string, string>;
    // ...
  };
  rendering: {
    enableWebGL: boolean;
    pixelReplication: boolean;
    // ...
  };
  // ...
}
```

## Error Handling

The core provides comprehensive error handling:

```typescript
// Listen for critical errors
dicomViewerCore.eventHub.on('error:critical', ({ error, context }) => {
  console.error(`Critical error in ${context}:`, error);
});

// Handle plugin errors
dicomViewerCore.pluginManager.on('plugin:error', ({ plugin, error }) => {
  console.error(`Plugin '${plugin.metadata.name}' error:`, error);
});
```

## Performance Monitoring

```typescript
// Monitor performance
const monitor = dicomViewerCore.performanceMonitor;

// Start timing
const timer = monitor.startTimer('image-load');
// ... perform operation
timer.end();

// Get metrics
const metrics = monitor.getMetrics();
console.log('Performance metrics:', metrics);
```

## TypeScript Support

The package is written in TypeScript and provides full type definitions:

```typescript
import type {
  DicomViewerCore,
  DicomViewerConfig,
  Plugin,
  PluginMetadata,
  DicomViewerEvents,
  EventHandler
} from '@opendicom/core';
```

## Contributing

See the main repository README for contribution guidelines.

## License

MIT License - see LICENSE file for details.