import { z } from 'zod';
import { eventHub } from './events';

/**
 * Configuration schemas using Zod for validation
 */

// Viewport configuration schema
const ViewportConfigSchema = z.object({
  defaultTool: z.string().default('wwwc'),
  enablePanning: z.boolean().default(true),
  enableZooming: z.boolean().default(true),
  enableRotation: z.boolean().default(true),
  enableFlipping: z.boolean().default(true),
  interpolation: z.enum(['nearest', 'linear']).default('linear'),
  invertColors: z.boolean().default(false),
  showPixelData: z.boolean().default(false),
  showImageInfo: z.boolean().default(true),
  showScaleOverlay: z.boolean().default(true),
  showOrientationMarkers: z.boolean().default(true),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
  foregroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#ffffff')
});

// Tools configuration schema
const ToolsConfigSchema = z.object({
  enabledTools: z.array(z.string()).default(['wwwc', 'zoom', 'pan', 'length', 'angle', 'rectangle', 'ellipse']),
  defaultMouseBindings: z.object({
    left: z.string().default('wwwc'),
    middle: z.string().default('pan'),
    right: z.string().default('zoom')
  }).default({}),
  defaultTouchBindings: z.object({
    singleTap: z.string().default('wwwc'),
    doubleTap: z.string().default('zoom'),
    pinch: z.string().default('zoom'),
    pan: z.string().default('pan')
  }).default({})
});

// Rendering configuration schema
const RenderingConfigSchema = z.object({
  useWebGL: z.boolean().default(true),
  enableCaching: z.boolean().default(true),
  maxCacheSize: z.number().positive().default(1024 * 1024 * 512),
  renderingEngine: z.enum(['cornerstone', 'vtk', 'custom']).default('cornerstone'),
  pixelReplication: z.boolean().default(false),
  strictMode: z.boolean().default(false)
});

// Layout configuration schema
const LayoutConfigSchema = z.object({
  rows: z.number().int().positive().default(1),
  columns: z.number().int().positive().default(1),
  spacing: z.number().nonnegative().default(2),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#1a1a1a'),
  borderColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#333333'),
  activeBorderColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#0078d4')
});

// Annotations configuration schema
const AnnotationsConfigSchema = z.object({
  enabled: z.boolean().default(true),
  showLabels: z.boolean().default(true),
  showMeasurements: z.boolean().default(true),
  fontSize: z.number().positive().default(12),
  fontFamily: z.string().default('Arial, sans-serif'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#ffff00'),
  lineWidth: z.number().positive().default(1),
  fillOpacity: z.number().min(0).max(1).default(0.2)
});

// Performance configuration schema
const PerformanceConfigSchema = z.object({
  enableWebWorkers: z.boolean().default(true),
  maxConcurrentRequests: z.number().int().positive().default(6),
  requestTimeout: z.number().positive().default(30000),
  retryAttempts: z.number().int().nonnegative().default(3),
  prefetchEnabled: z.boolean().default(true),
  prefetchDistance: z.number().int().positive().default(5)
});

// Security configuration schema
const SecurityConfigSchema = z.object({
  enableCORS: z.boolean().default(true),
  allowedOrigins: z.array(z.string()).default(['*']),
  enableCSP: z.boolean().default(false),
  sanitizeMetadata: z.boolean().default(true)
});

// Logging configuration schema
const LoggingConfigSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  enableConsole: z.boolean().default(true),
  enableRemote: z.boolean().default(false),
  remoteEndpoint: z.string().url().optional(),
  maxLogSize: z.number().int().positive().default(1000)
});

// Main configuration schema
export const DicomViewerConfigSchema = z.object({
  viewport: ViewportConfigSchema.default({}),
  tools: ToolsConfigSchema.default({}),
  rendering: RenderingConfigSchema.default({}),
  layout: LayoutConfigSchema.default({}),
  annotations: AnnotationsConfigSchema.default({}),
  performance: PerformanceConfigSchema.default({}),
  security: SecurityConfigSchema.default({}),
  logging: LoggingConfigSchema.default({})
});

export type DicomViewerConfig = z.infer<typeof DicomViewerConfigSchema>;

/**
 * Configuration manager class
 */
export class ConfigManager {
  private config: DicomViewerConfig;
  private validators = new Map<string, z.ZodSchema>();
  private watchers = new Map<string, Array<(value: any, previousValue: any) => void>>();
  
  constructor(initialConfig?: Partial<DicomViewerConfig>) {
    // Initialize with default config and merge with provided config
    this.config = DicomViewerConfigSchema.parse(initialConfig || {});
    
    // Register schema validators
    this.registerValidator('viewport', ViewportConfigSchema);
    this.registerValidator('tools', ToolsConfigSchema);
    this.registerValidator('rendering', RenderingConfigSchema);
    this.registerValidator('layout', LayoutConfigSchema);
    this.registerValidator('annotations', AnnotationsConfigSchema);
    this.registerValidator('performance', PerformanceConfigSchema);
    this.registerValidator('security', SecurityConfigSchema);
    this.registerValidator('logging', LoggingConfigSchema);
  }
  
  /**
   * Get the entire configuration
   */
  getConfig(): DicomViewerConfig {
    return { ...this.config };
  }
  
  /**
   * Get a configuration section
   */
  getSection<K extends keyof DicomViewerConfig>(section: K): DicomViewerConfig[K] {
    return { ...this.config[section] };
  }
  
  /**
   * Get a specific configuration value
   */
  getValue<K extends keyof DicomViewerConfig, P extends keyof DicomViewerConfig[K]>(
    section: K,
    property: P
  ): DicomViewerConfig[K][P] {
    return this.config[section][property];
  }
  
  /**
   * Update the entire configuration
   */
  updateConfig(newConfig: Partial<DicomViewerConfig>): void {
    const previousConfig = { ...this.config };
    
    try {
      // Validate the new configuration
      const validatedConfig = DicomViewerConfigSchema.parse({
        ...this.config,
        ...newConfig
      });
      
      this.config = validatedConfig;
      
      // Emit change events
      this.emitConfigChanges(previousConfig, this.config);
      
    } catch (error) {
      throw new Error(`Configuration validation failed: ${(error as z.ZodError).message}`);
    }
  }
  
  /**
   * Update a configuration section
   */
  updateSection<K extends keyof DicomViewerConfig>(
    section: K,
    updates: Partial<DicomViewerConfig[K]>
  ): void {
    const previousValue = { ...this.config[section] };
    
    try {
      // Validate the section
      const validator = this.validators.get(section as string);
      if (validator) {
        const validatedSection = validator.parse({
          ...this.config[section],
          ...updates
        });
        
        this.config[section] = validatedSection;
      } else {
        // Fallback to direct assignment if no validator
        Object.assign(this.config[section], updates);
      }
      
      // Emit change event
      eventHub.emit('config:changed', {
        key: section as string,
        value: this.config[section],
        previousValue
      });
      
      // Notify watchers
      this.notifyWatchers(section as string, this.config[section], previousValue);
      
    } catch (error) {
      throw new Error(`Section '${section}' validation failed: ${(error as z.ZodError).message}`);
    }
  }
  
  /**
   * Update a specific configuration value
   */
  setValue<K extends keyof DicomViewerConfig, P extends keyof DicomViewerConfig[K]>(
    section: K,
    property: P,
    value: DicomViewerConfig[K][P]
  ): void {
    const previousValue = this.config[section][property];
    
    try {
      // Create a temporary section with the new value for validation
      const tempSection = {
        ...this.config[section],
        [property]: value
      };
      
      // Validate the section
      const validator = this.validators.get(section as string);
      if (validator) {
        validator.parse(tempSection);
      }
      
      // Update the value
      (this.config[section] as any)[property] = value;
      
      // Emit change event
      eventHub.emit('config:changed', {
        key: `${section as string}.${property as string}`,
        value,
        previousValue
      });
      
      // Notify watchers
      this.notifyWatchers(`${section as string}.${property as string}`, value, previousValue);
      
    } catch (error) {
      throw new Error(`Value validation failed for '${section}.${property as string}': ${(error as z.ZodError).message}`);
    }
  }
  
  /**
   * Reset configuration to defaults
   */
  reset(section?: keyof DicomViewerConfig): void {
    const previousConfig = { ...this.config };
    
    if (section) {
      // Reset specific section
      const validator = this.validators.get(section as string);
      if (validator) {
        this.config[section] = validator.parse({});
      }
      
      eventHub.emit('config:reset', { section: section as string });
    } else {
      // Reset entire configuration
      this.config = DicomViewerConfigSchema.parse({});
      eventHub.emit('config:reset', {});
    }
    
    // Emit change events
    this.emitConfigChanges(previousConfig, this.config);
  }
  
  /**
   * Validate configuration
   */
  validate(config?: Partial<DicomViewerConfig>): { valid: boolean; errors: string[] } {
    try {
      DicomViewerConfigSchema.parse(config || this.config);
      return { valid: true, errors: [] };
    } catch (error) {
      const zodError = error as z.ZodError;
      return {
        valid: false,
        errors: zodError.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      };
    }
  }
  
  /**
   * Watch for configuration changes
   */
  watch(
    path: string,
    callback: (value: any, previousValue: any) => void
  ): () => void {
    let watchers = this.watchers.get(path);
    if (!watchers) {
      watchers = [];
      this.watchers.set(path, watchers);
    }
    
    watchers.push(callback);
    
    // Return unwatch function
    return () => {
      const watchers = this.watchers.get(path);
      if (watchers) {
        const index = watchers.indexOf(callback);
        if (index !== -1) {
          watchers.splice(index, 1);
          if (watchers.length === 0) {
            this.watchers.delete(path);
          }
        }
      }
    };
  }
  
  /**
   * Export configuration to JSON
   */
  export(): string {
    return JSON.stringify(this.config, null, 2);
  }
  
  /**
   * Import configuration from JSON
   */
  import(json: string): void {
    try {
      const importedConfig = JSON.parse(json);
      this.updateConfig(importedConfig);
    } catch (error) {
      throw new Error(`Failed to import configuration: ${(error as Error).message}`);
    }
  }
  
  /**
   * Create a configuration preset
   */
  createPreset(name: string, config: Partial<DicomViewerConfig>): void {
    // Store preset in localStorage or other storage mechanism
    if (typeof window !== 'undefined' && window.localStorage) {
      const presets = this.getPresets();
      presets[name] = config;
      localStorage.setItem('dicom-viewer-presets', JSON.stringify(presets));
    }
  }
  
  /**
   * Load a configuration preset
   */
  loadPreset(name: string): void {
    const presets = this.getPresets();
    const preset = presets[name];
    
    if (!preset) {
      throw new Error(`Preset '${name}' not found`);
    }
    
    this.updateConfig(preset);
  }
  
  /**
   * Get all available presets
   */
  getPresets(): Record<string, Partial<DicomViewerConfig>> {
    if (typeof window !== 'undefined' && window.localStorage) {
      const presetsJson = localStorage.getItem('dicom-viewer-presets');
      return presetsJson ? JSON.parse(presetsJson) : {};
    }
    return {};
  }
  
  /**
   * Delete a preset
   */
  deletePreset(name: string): void {
    const presets = this.getPresets();
    delete presets[name];
    
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('dicom-viewer-presets', JSON.stringify(presets));
    }
  }
  
  private registerValidator(section: string, schema: z.ZodSchema): void {
    this.validators.set(section, schema);
  }
  
  private emitConfigChanges(previous: DicomViewerConfig, current: DicomViewerConfig): void {
    // Compare sections and emit change events
    for (const section of Object.keys(current) as Array<keyof DicomViewerConfig>) {
      if (JSON.stringify(previous[section]) !== JSON.stringify(current[section])) {
        eventHub.emit('config:changed', {
          key: section as string,
          value: current[section],
          previousValue: previous[section]
        });
        
        this.notifyWatchers(section as string, current[section], previous[section]);
      }
    }
  }
  
  private notifyWatchers(path: string, value: any, previousValue: any): void {
    const watchers = this.watchers.get(path);
    if (watchers) {
      watchers.forEach(callback => {
        try {
          callback(value, previousValue);
        } catch (error) {
          console.error(`Error in config watcher for '${path}':`, error);
        }
      });
    }
  }
}

/**
 * Global configuration manager instance
 */
export const configManager = new ConfigManager();

/**
 * Configuration utilities
 */
export class ConfigUtils {
  /**
   * Merge configurations deeply
   */
  static mergeConfigs(
    base: Partial<DicomViewerConfig>,
    override: Partial<DicomViewerConfig>
  ): Partial<DicomViewerConfig> {
    const result = { ...base };
    
    for (const key of Object.keys(override) as Array<keyof DicomViewerConfig>) {
      if (typeof override[key] === 'object' && override[key] !== null) {
        result[key] = {
          ...(result[key] as any),
          ...override[key]
        };
      } else {
        result[key] = override[key] as any;
      }
    }
    
    return result;
  }
  
  /**
   * Get configuration diff
   */
  static getConfigDiff(
    config1: DicomViewerConfig,
    config2: DicomViewerConfig
  ): Partial<DicomViewerConfig> {
    const diff: any = {};
    
    for (const section of Object.keys(config1) as Array<keyof DicomViewerConfig>) {
      const sectionDiff: any = {};
      const section1 = config1[section] as any;
      const section2 = config2[section] as any;
      
      for (const key of Object.keys(section1)) {
        if (JSON.stringify(section1[key]) !== JSON.stringify(section2[key])) {
          sectionDiff[key] = section2[key];
        }
      }
      
      if (Object.keys(sectionDiff).length > 0) {
        diff[section] = sectionDiff;
      }
    }
    
    return diff;
  }
  
  /**
   * Create a configuration builder
   */
  static builder(): ConfigBuilder {
    return new ConfigBuilder();
  }
}

/**
 * Configuration builder for fluent API
 */
export class ConfigBuilder {
  private config: Partial<DicomViewerConfig> = {};
  
  viewport(config: Partial<DicomViewerConfig['viewport']>): this {
    this.config.viewport = { ...this.config.viewport, ...config };
    return this;
  }
  
  tools(config: Partial<DicomViewerConfig['tools']>): this {
    this.config.tools = { ...this.config.tools, ...config };
    return this;
  }
  
  rendering(config: Partial<DicomViewerConfig['rendering']>): this {
    this.config.rendering = { ...this.config.rendering, ...config };
    return this;
  }
  
  layout(config: Partial<DicomViewerConfig['layout']>): this {
    this.config.layout = { ...this.config.layout, ...config };
    return this;
  }
  
  annotations(config: Partial<DicomViewerConfig['annotations']>): this {
    this.config.annotations = { ...this.config.annotations, ...config };
    return this;
  }
  
  performance(config: Partial<DicomViewerConfig['performance']>): this {
    this.config.performance = { ...this.config.performance, ...config };
    return this;
  }
  
  security(config: Partial<DicomViewerConfig['security']>): this {
    this.config.security = { ...this.config.security, ...config };
    return this;
  }
  
  logging(config: Partial<DicomViewerConfig['logging']>): this {
    this.config.logging = { ...this.config.logging, ...config };
    return this;
  }
  
  build(): Partial<DicomViewerConfig> {
    return { ...this.config };
  }
}