import { EventEmitter } from 'events';
import { DicomViewerConfig } from './types';

/**
 * Plugin lifecycle states
 */
export enum PluginState {
  UNREGISTERED = 'unregistered',
  REGISTERED = 'registered',
  INITIALIZED = 'initialized',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error'
}

/**
 * Plugin metadata interface
 */
export interface PluginMetadata {
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: string[];
  peerDependencies?: string[];
  tags?: string[];
}

/**
 * Plugin configuration interface
 */
export interface PluginConfig {
  enabled: boolean;
  priority: number;
  settings?: Record<string, any>;
}

/**
 * Plugin context provided to plugins
 */
export interface PluginContext {
  config: DicomViewerConfig;
  eventHub: EventEmitter;
  services: Map<string, any>;
  logger: {
    debug: (message: string, ...args: any[]) => void;
    info: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
  };
}

/**
 * Base plugin interface
 */
export interface Plugin {
  metadata: PluginMetadata;
  config: PluginConfig;
  state: PluginState;
  
  /**
   * Initialize the plugin
   */
  initialize(context: PluginContext): Promise<void> | void;
  
  /**
   * Activate the plugin
   */
  activate(context: PluginContext): Promise<void> | void;
  
  /**
   * Deactivate the plugin
   */
  deactivate(context: PluginContext): Promise<void> | void;
  
  /**
   * Cleanup plugin resources
   */
  destroy(context: PluginContext): Promise<void> | void;
  
  /**
   * Handle configuration changes
   */
  onConfigChange?(newConfig: PluginConfig, context: PluginContext): Promise<void> | void;
}

/**
 * Plugin registration options
 */
export interface PluginRegistrationOptions {
  autoActivate?: boolean;
  config?: Partial<PluginConfig>;
}

/**
 * Plugin manager events
 */
export interface PluginManagerEvents {
  'plugin:registered': { plugin: Plugin };
  'plugin:unregistered': { plugin: Plugin };
  'plugin:initialized': { plugin: Plugin };
  'plugin:activated': { plugin: Plugin };
  'plugin:deactivated': { plugin: Plugin };
  'plugin:error': { plugin: Plugin; error: Error };
  'plugin:config-changed': { plugin: Plugin; config: PluginConfig };
}

/**
 * Plugin manager class
 */
export class PluginManager extends EventEmitter {
  private plugins = new Map<string, Plugin>();
  private context: PluginContext;
  private dependencyGraph = new Map<string, Set<string>>();
  
  constructor(context: PluginContext) {
    super();
    this.context = context;
  }
  
  /**
   * Register a plugin
   */
  async register(
    plugin: Plugin,
    options: PluginRegistrationOptions = {}
  ): Promise<void> {
    const { name } = plugin.metadata;
    
    if (this.plugins.has(name)) {
      throw new Error(`Plugin '${name}' is already registered`);
    }
    
    // Apply configuration overrides
    if (options.config) {
      plugin.config = { ...plugin.config, ...options.config };
    }
    
    // Set initial state
    plugin.state = PluginState.REGISTERED;
    
    // Store plugin
    this.plugins.set(name, plugin);
    
    // Build dependency graph
    this.updateDependencyGraph(plugin);
    
    this.emit('plugin:registered', { plugin });
    
    // Auto-initialize and activate if requested
    if (options.autoActivate !== false) {
      await this.initialize(name);
      await this.activate(name);
    }
  }
  
  /**
   * Unregister a plugin
   */
  async unregister(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin '${name}' is not registered`);
    }
    
    // Deactivate and destroy if needed
    if (plugin.state === PluginState.ACTIVE) {
      await this.deactivate(name);
    }
    
    if (plugin.state === PluginState.INITIALIZED) {
      await this.destroy(name);
    }
    
    // Remove from dependency graph
    this.dependencyGraph.delete(name);
    
    // Remove plugin
    this.plugins.delete(name);
    
    plugin.state = PluginState.UNREGISTERED;
    this.emit('plugin:unregistered', { plugin });
  }
  
  /**
   * Initialize a plugin
   */
  async initialize(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin '${name}' is not registered`);
    }
    
    if (plugin.state !== PluginState.REGISTERED) {
      return; // Already initialized or in error state
    }
    
    try {
      // Initialize dependencies first
      await this.initializeDependencies(name);
      
      // Initialize the plugin
      await plugin.initialize(this.context);
      plugin.state = PluginState.INITIALIZED;
      
      this.emit('plugin:initialized', { plugin });
    } catch (error) {
      plugin.state = PluginState.ERROR;
      this.emit('plugin:error', { plugin, error: error as Error });
      throw error;
    }
  }
  
  /**
   * Activate a plugin
   */
  async activate(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin '${name}' is not registered`);
    }
    
    if (!plugin.config.enabled) {
      return; // Plugin is disabled
    }
    
    if (plugin.state === PluginState.ACTIVE) {
      return; // Already active
    }
    
    if (plugin.state !== PluginState.INITIALIZED) {
      await this.initialize(name);
    }
    
    try {
      await plugin.activate(this.context);
      plugin.state = PluginState.ACTIVE;
      
      this.emit('plugin:activated', { plugin });
    } catch (error) {
      plugin.state = PluginState.ERROR;
      this.emit('plugin:error', { plugin, error: error as Error });
      throw error;
    }
  }
  
  /**
   * Deactivate a plugin
   */
  async deactivate(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin '${name}' is not registered`);
    }
    
    if (plugin.state !== PluginState.ACTIVE) {
      return; // Not active
    }
    
    try {
      await plugin.deactivate(this.context);
      plugin.state = PluginState.INACTIVE;
      
      this.emit('plugin:deactivated', { plugin });
    } catch (error) {
      plugin.state = PluginState.ERROR;
      this.emit('plugin:error', { plugin, error: error as Error });
      throw error;
    }
  }
  
  /**
   * Destroy a plugin
   */
  async destroy(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      return;
    }
    
    try {
      await plugin.destroy(this.context);
      plugin.state = PluginState.REGISTERED;
    } catch (error) {
      plugin.state = PluginState.ERROR;
      this.emit('plugin:error', { plugin, error: error as Error });
      throw error;
    }
  }
  
  /**
   * Update plugin configuration
   */
  async updateConfig(name: string, config: Partial<PluginConfig>): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin '${name}' is not registered`);
    }
    
    const oldConfig = { ...plugin.config };
    plugin.config = { ...plugin.config, ...config };
    
    try {
      if (plugin.onConfigChange) {
        await plugin.onConfigChange(plugin.config, this.context);
      }
      
      this.emit('plugin:config-changed', { plugin, config: plugin.config });
      
      // Handle enable/disable state changes
      if (oldConfig.enabled !== plugin.config.enabled) {
        if (plugin.config.enabled && plugin.state === PluginState.INACTIVE) {
          await this.activate(name);
        } else if (!plugin.config.enabled && plugin.state === PluginState.ACTIVE) {
          await this.deactivate(name);
        }
      }
    } catch (error) {
      // Rollback configuration on error
      plugin.config = oldConfig;
      throw error;
    }
  }
  
  /**
   * Get plugin by name
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }
  
  /**
   * Get all plugins
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }
  
  /**
   * Get plugins by state
   */
  getPluginsByState(state: PluginState): Plugin[] {
    return this.getAllPlugins().filter(plugin => plugin.state === state);
  }
  
  /**
   * Get active plugins sorted by priority
   */
  getActivePlugins(): Plugin[] {
    return this.getPluginsByState(PluginState.ACTIVE)
      .sort((a, b) => b.config.priority - a.config.priority);
  }
  
  private updateDependencyGraph(plugin: Plugin): void {
    const { name, dependencies = [] } = plugin.metadata;
    this.dependencyGraph.set(name, new Set(dependencies));
  }
  
  private async initializeDependencies(name: string): Promise<void> {
    const dependencies = this.dependencyGraph.get(name) || new Set();
    
    for (const depName of dependencies) {
      const depPlugin = this.plugins.get(depName);
      if (!depPlugin) {
        throw new Error(`Dependency '${depName}' for plugin '${name}' is not registered`);
      }
      
      if (depPlugin.state === PluginState.REGISTERED) {
        await this.initialize(depName);
      }
    }
  }
}

/**
 * Abstract base plugin class for easier plugin development
 */
export abstract class BasePlugin implements Plugin {
  abstract metadata: PluginMetadata;
  
  config: PluginConfig = {
    enabled: true,
    priority: 0,
    settings: {}
  };
  
  state: PluginState = PluginState.UNREGISTERED;
  
  async initialize(context: PluginContext): Promise<void> {
    // Override in subclass if needed
  }
  
  async activate(context: PluginContext): Promise<void> {
    // Override in subclass if needed
  }
  
  async deactivate(context: PluginContext): Promise<void> {
    // Override in subclass if needed
  }
  
  async destroy(context: PluginContext): Promise<void> {
    // Override in subclass if needed
  }
}