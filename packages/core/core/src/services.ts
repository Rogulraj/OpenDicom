/**
 * Service injection container for dependency management
 */

export type ServiceFactory<T = any> = () => T | Promise<T>;
export type ServiceInstance<T = any> = T;

/**
 * Service lifecycle types
 */
export enum ServiceLifecycle {
  SINGLETON = 'singleton',
  TRANSIENT = 'transient',
  SCOPED = 'scoped'
}

/**
 * Service registration options
 */
export interface ServiceRegistration<T = any> {
  factory: ServiceFactory<T>;
  lifecycle: ServiceLifecycle;
  dependencies?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Service container interface
 */
export interface IServiceContainer {
  register<T>(name: string, registration: ServiceRegistration<T>): void;
  registerSingleton<T>(name: string, factory: ServiceFactory<T>, dependencies?: string[]): void;
  registerTransient<T>(name: string, factory: ServiceFactory<T>, dependencies?: string[]): void;
  registerInstance<T>(name: string, instance: T): void;
  resolve<T>(name: string): Promise<T>;
  resolveSync<T>(name: string): T;
  isRegistered(name: string): boolean;
  unregister(name: string): void;
  clear(): void;
  getRegisteredServices(): string[];
  createScope(): IServiceContainer;
}

/**
 * Service container implementation
 */
export class ServiceContainer implements IServiceContainer {
  private services = new Map<string, ServiceRegistration>();
  private singletonInstances = new Map<string, any>();
  private scopedInstances = new Map<string, any>();
  private resolutionStack = new Set<string>();
  private parent?: ServiceContainer;
  
  constructor(parent?: ServiceContainer) {
    this.parent = parent;
  }
  
  /**
   * Register a service with full configuration
   */
  register<T>(name: string, registration: ServiceRegistration<T>): void {
    if (this.services.has(name)) {
      throw new Error(`Service '${name}' is already registered`);
    }
    
    this.services.set(name, registration);
  }
  
  /**
   * Register a singleton service
   */
  registerSingleton<T>(
    name: string,
    factory: ServiceFactory<T>,
    dependencies: string[] = []
  ): void {
    this.register(name, {
      factory,
      lifecycle: ServiceLifecycle.SINGLETON,
      dependencies
    });
  }
  
  /**
   * Register a transient service
   */
  registerTransient<T>(
    name: string,
    factory: ServiceFactory<T>,
    dependencies: string[] = []
  ): void {
    this.register(name, {
      factory,
      lifecycle: ServiceLifecycle.TRANSIENT,
      dependencies
    });
  }
  
  /**
   * Register a service instance
   */
  registerInstance<T>(name: string, instance: T): void {
    this.singletonInstances.set(name, instance);
    this.register(name, {
      factory: () => instance,
      lifecycle: ServiceLifecycle.SINGLETON
    });
  }
  
  /**
   * Resolve a service asynchronously
   */
  async resolve<T>(name: string): Promise<T> {
    // Check for circular dependencies
    if (this.resolutionStack.has(name)) {
      const stack = Array.from(this.resolutionStack).join(' -> ');
      throw new Error(`Circular dependency detected: ${stack} -> ${name}`);
    }
    
    // Check local registration
    const registration = this.services.get(name);
    if (!registration) {
      // Check parent container
      if (this.parent) {
        return this.parent.resolve<T>(name);
      }
      throw new Error(`Service '${name}' is not registered`);
    }
    
    // Handle different lifecycles
    switch (registration.lifecycle) {
      case ServiceLifecycle.SINGLETON:
        return this.resolveSingleton<T>(name, registration);
      
      case ServiceLifecycle.SCOPED:
        return this.resolveScoped<T>(name, registration);
      
      case ServiceLifecycle.TRANSIENT:
      default:
        return this.resolveTransient<T>(name, registration);
    }
  }
  
  /**
   * Resolve a service synchronously (only for already instantiated services)
   */
  resolveSync<T>(name: string): T {
    // Check singleton instances
    if (this.singletonInstances.has(name)) {
      return this.singletonInstances.get(name);
    }
    
    // Check scoped instances
    if (this.scopedInstances.has(name)) {
      return this.scopedInstances.get(name);
    }
    
    // Check parent container
    if (this.parent) {
      try {
        return this.parent.resolveSync<T>(name);
      } catch {
        // Continue to error below
      }
    }
    
    throw new Error(`Service '${name}' is not available synchronously. Use resolve() instead.`);
  }
  
  /**
   * Check if a service is registered
   */
  isRegistered(name: string): boolean {
    return this.services.has(name) || (this.parent?.isRegistered(name) ?? false);
  }
  
  /**
   * Unregister a service
   */
  unregister(name: string): void {
    this.services.delete(name);
    this.singletonInstances.delete(name);
    this.scopedInstances.delete(name);
  }
  
  /**
   * Clear all services
   */
  clear(): void {
    this.services.clear();
    this.singletonInstances.clear();
    this.scopedInstances.clear();
  }
  
  /**
   * Get all registered service names
   */
  getRegisteredServices(): string[] {
    const localServices = Array.from(this.services.keys());
    const parentServices = this.parent?.getRegisteredServices() ?? [];
    return [...new Set([...localServices, ...parentServices])];
  }
  
  /**
   * Create a scoped container
   */
  createScope(): IServiceContainer {
    return new ServiceContainer(this);
  }
  
  /**
   * Get service registration info
   */
  getServiceInfo(name: string): ServiceRegistration | undefined {
    return this.services.get(name) || this.parent?.getServiceInfo(name);
  }
  
  /**
   * Get services by tag
   */
  getServicesByTag(tag: string): string[] {
    const services: string[] = [];
    
    for (const [name, registration] of this.services) {
      if (registration.tags?.includes(tag)) {
        services.push(name);
      }
    }
    
    if (this.parent) {
      services.push(...this.parent.getServicesByTag(tag));
    }
    
    return [...new Set(services)];
  }
  
  private async resolveSingleton<T>(name: string, registration: ServiceRegistration<T>): Promise<T> {
    // Check if already instantiated
    if (this.singletonInstances.has(name)) {
      return this.singletonInstances.get(name);
    }
    
    // Create instance
    const instance = await this.createInstance<T>(name, registration);
    this.singletonInstances.set(name, instance);
    return instance;
  }
  
  private async resolveScoped<T>(name: string, registration: ServiceRegistration<T>): Promise<T> {
    // Check if already instantiated in this scope
    if (this.scopedInstances.has(name)) {
      return this.scopedInstances.get(name);
    }
    
    // Create instance
    const instance = await this.createInstance<T>(name, registration);
    this.scopedInstances.set(name, instance);
    return instance;
  }
  
  private async resolveTransient<T>(name: string, registration: ServiceRegistration<T>): Promise<T> {
    return this.createInstance<T>(name, registration);
  }
  
  private async createInstance<T>(name: string, registration: ServiceRegistration<T>): Promise<T> {
    this.resolutionStack.add(name);
    
    try {
      // Resolve dependencies
      const dependencies: any[] = [];
      if (registration.dependencies) {
        for (const depName of registration.dependencies) {
          const dependency = await this.resolve(depName);
          dependencies.push(dependency);
        }
      }
      
      // Create instance
      const instance = await registration.factory(...dependencies);
      return instance;
    } finally {
      this.resolutionStack.delete(name);
    }
  }
}

/**
 * Global service container instance
 */
export const serviceContainer = new ServiceContainer();

/**
 * Service decorators and utilities
 */
export class ServiceUtils {
  /**
   * Create a service decorator
   */
  static injectable(name: string, lifecycle: ServiceLifecycle = ServiceLifecycle.SINGLETON) {
    return function <T extends new (...args: any[]) => any>(constructor: T) {
      serviceContainer.register(name, {
        factory: () => new constructor(),
        lifecycle
      });
      return constructor;
    };
  }
  
  /**
   * Create a factory service
   */
  static factory<T>(
    name: string,
    factory: ServiceFactory<T>,
    lifecycle: ServiceLifecycle = ServiceLifecycle.SINGLETON,
    dependencies: string[] = []
  ): void {
    serviceContainer.register(name, {
      factory,
      lifecycle,
      dependencies
    });
  }
  
  /**
   * Resolve multiple services
   */
  static async resolveAll<T extends Record<string, any>>(
    services: { [K in keyof T]: string }
  ): Promise<T> {
    const result = {} as T;
    
    for (const [key, serviceName] of Object.entries(services)) {
      result[key as keyof T] = await serviceContainer.resolve(serviceName);
    }
    
    return result;
  }
  
  /**
   * Create a service proxy that resolves lazily
   */
  static lazy<T>(serviceName: string): T {
    return new Proxy({} as T, {
      get(target, prop) {
        const service = serviceContainer.resolveSync<T>(serviceName);
        return (service as any)[prop];
      },
      
      set(target, prop, value) {
        const service = serviceContainer.resolveSync<T>(serviceName);
        (service as any)[prop] = value;
        return true;
      }
    });
  }
}

/**
 * Common service interfaces
 */
export interface ILogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

export interface IImageLoader {
  loadImage(imageId: string): Promise<any>;
  prefetchImage(imageId: string): Promise<void>;
  clearCache(): void;
}

export interface IRenderer {
  render(element: HTMLElement, image: any): Promise<void>;
  resize(element: HTMLElement): void;
  destroy(element: HTMLElement): void;
}

export interface IToolManager {
  activateTool(toolName: string, viewportId?: string): void;
  deactivateTool(toolName: string, viewportId?: string): void;
  getActiveTool(viewportId?: string): string | null;
  registerTool(toolName: string, toolClass: any): void;
}

/**
 * Service registration helpers
 */
export function registerCoreServices(): void {
  // Register core services here
  // This will be called during initialization
}

/**
 * Service container builder
 */
export class ServiceContainerBuilder {
  private container = new ServiceContainer();
  
  singleton<T>(name: string, factory: ServiceFactory<T>, dependencies?: string[]): this {
    this.container.registerSingleton(name, factory, dependencies);
    return this;
  }
  
  transient<T>(name: string, factory: ServiceFactory<T>, dependencies?: string[]): this {
    this.container.registerTransient(name, factory, dependencies);
    return this;
  }
  
  instance<T>(name: string, instance: T): this {
    this.container.registerInstance(name, instance);
    return this;
  }
  
  build(): IServiceContainer {
    return this.container;
  }
}