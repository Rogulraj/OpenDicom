# AI Code Editor Prompts - DICOM Viewer Project Phase 1

### OpenDicom

## Task 1: Project Foundation Setup

### Context & Role
You are an expert TypeScript developer specializing in medical imaging applications and monorepo architecture. You're building a modular, open-source DICOM viewer web application.

### Project Overview
- **Project Name**: OpenDicom
- **Project**: Web-based DICOM viewer with modular NPM packages
- **Core Libraries**: Cornerstone.js, dcmjs  
- **Tech Stack**: Next.js, TypeScript, Tailwind CSS, shadcn/ui
- **State Management**: Zustand (lightweight, hook-based)
- **Architecture**: Monorepo with Lerna, 16 independent NPM packages
- **Target**: Medical professionals, developers, open-source community

### Current Task: Initialize Monorepo Structure
**Objective**: Set up the foundational monorepo structure with Lerna, TypeScript configuration, and essential tooling.

**Requirements**:
1. Create root directory structure for monorepo
2. Initialize Lerna with independent versioning
3. Configure TypeScript with path mapping for packages
4. Set up ESLint and Prettier with medical imaging specific rules
5. Create package.json with workspace configuration
6. Add basic GitHub Actions workflow for CI/CD

**Directory Structure Needed**:
```
dicom-viewer/
├── packages/
│   ├── core/
│   │   ├── core/                  # @opendicom/core
│   │   ├── image-loader/          # @opendicom/image-loader
│   │   ├── events/                # @opendicom/events
│   │   ├── ui/                    # @opendicom/ui
│   │   └── viewport/              # @opendicom/viewport
├── tools/
├── docs/
├── lerna.json
├── package.json
├── tsconfig.json
└── .github/workflows/
```

**Instructions**:
- Use independent versioning mode in Lerna
- Configure TypeScript with strict mode enabled
- Set up path mapping for @opendicom/* packages
- Include build scripts for all packages
- Add conventional commits configuration

**Output Format**: Provide configuration files and shell commands to execute.

---

## Task 2: Core Package Architecture

### Context & Role
You are designing the foundational architecture for the @opendicom/core package - the heart of the modular DICOM viewer system.

### Package Details
- **Name**: @opendicom/core
- **Purpose**: Central plugin system, event hub, configuration management
- **Dependencies**: cornerstone-core, dcmjs
- **State Management**: Zustand stores for viewer state
- **Architecture Pattern**: Plugin-based with service injection

### Current Task: Design Core Package Structure
**Objective**: Create the core package with plugin system, event management, and Zustand state stores.

**Requirements**:
1. Create plugin interface and registration system
2. Implement central event hub with TypeScript event types
3. Set up Zustand stores for viewer configuration and state
4. Create service injection container
5. Add configuration management with validation
6. Include logging and error handling utilities

**Key Components to Implement**:
- `PluginSystem`: Plugin registration and lifecycle management
- `EventHub`: Type-safe pub/sub event system  
- `ViewerManager`: Central coordinator for viewer instances
- `ConfigManager`: Configuration validation and management
- Zustand stores: `useViewerStore`, `useConfigStore`

**Zustand Store Pattern**:
```typescript
// Example structure for viewer store
interface ViewerState {
  activeViewer: string | null;
  viewports: Record<string, ViewportConfig>;
  plugins: string[];
  // State methods
  setActiveViewer: (id: string) => void;
  addViewport: (config: ViewportConfig) => void;
  registerPlugin: (pluginId: string) => void;
}
```

**Instructions**:
- Use TypeScript interfaces for all plugin contracts
- Implement dependency injection for services
- Create typed event system with strict event definitions
- Use Zustand's immer middleware for complex state updates
- Include comprehensive JSDoc documentation

**Output Format**: TypeScript files with interfaces, classes, and Zustand stores.

---

## Task 3: Event System Implementation

### Context & Role
You are implementing a robust, type-safe event system for inter-component communication in the DICOM viewer.

### Package Details
- **Name**: @opendicom/events
- **Purpose**: Centralized event management with TypeScript safety
- **Dependencies**: @opendicom/core
- **Pattern**: Publisher-Subscriber with middleware support

### Current Task: Build Type-Safe Event System
**Objective**: Create a comprehensive event system that ensures type safety and supports middleware.

**Requirements**:
1. Define event interface with strict typing
2. Implement EventManager with subscription management
3. Create event middleware pipeline for logging, validation
4. Add event namespacing for different viewer concerns
5. Include async event handling capabilities
6. Set up event persistence for debugging

**Event Categories**:
```typescript
interface ViewerEvents {
  // Image events
  'image:loaded': { imageId: string; metadata: DicomMetadata };
  'image:error': { imageId: string; error: Error };
  
  // Viewport events  
  'viewport:created': { viewportId: string; type: ViewportType };
  'viewport:camera-changed': { viewportId: string; camera: Camera };
  
  // Tool events
  'tool:activated': { toolName: string; viewportId: string };
  'tool:deactivated': { toolName: string; viewportId: string };
  
  // Annotation events
  'annotation:created': { annotation: Annotation; viewportId: string };
  'annotation:modified': { annotation: Annotation; changes: object };
}
```

**Middleware Features**:
- Event logging with severity levels
- Event validation against schemas
- Performance monitoring for event processing
- Event replay capability for debugging

**Instructions**:
- Use generic TypeScript for type-safe event handling
- Implement event batching for performance
- Add subscription cleanup to prevent memory leaks
- Include event debugging utilities
- Support both sync and async event handlers

**Output Format**: TypeScript event system with manager, middleware, and utilities.

---

## Task 4: Zustand State Architecture

### Context & Role
You are designing the state management architecture using Zustand for the DICOM viewer application.

### State Management Requirements
- **Library**: Zustand with TypeScript
- **Pattern**: Multiple stores by domain
- **Features**: Persistence, dev tools, middleware
- **Integration**: React hooks, async actions

### Current Task: Design Zustand Store Architecture
**Objective**: Create modular Zustand stores for different aspects of the DICOM viewer.

**Store Domains**:
1. **Viewer Store**: Active viewers, viewport management
2. **Image Store**: Loaded images, metadata, caching
3. **Tool Store**: Active tools, tool state, configurations  
4. **UI Store**: Layout, themes, modal states
5. **Settings Store**: User preferences, application config

**Requirements**:
1. Create separate stores for each domain
2. Implement cross-store communication patterns
3. Add persistence for user preferences
4. Include dev tools integration
5. Set up async action patterns
6. Add store reset capabilities

**Example Store Structure**:
```typescript
// Viewer Store
interface ViewerState {
  viewers: Record<string, ViewerInstance>;
  activeViewerId: string | null;
  
  // Actions
  createViewer: (config: ViewerConfig) => string;
  setActiveViewer: (id: string) => void;
  destroyViewer: (id: string) => void;
}

// Image Store  
interface ImageState {
  images: Record<string, ImageData>;
  loadingStates: Record<string, LoadingState>;
  
  // Async actions
  loadImage: (imageId: string) => Promise<void>;
  preloadImages: (imageIds: string[]) => Promise<void>;
}
```

**Instructions**:
- Use Zustand's subscribe pattern for cross-store communication
- Implement proper TypeScript typing for all stores
- Add error handling for async actions
- Include loading states for async operations
- Set up store persistence with selective fields
- Add development tools integration

**Output Format**: TypeScript store definitions with hooks and utilities.

---

## Task 5: Development Tooling Setup

### Context & Role
You are setting up comprehensive development tooling for the DICOM viewer monorepo to ensure code quality and developer experience.

### Tooling Requirements
- **Build System**: Rollup for package bundling
- **Testing**: Jest with React Testing Library
- **Documentation**: TypeDoc with custom themes
- **Code Quality**: ESLint, Prettier, Husky
- **CI/CD**: GitHub Actions workflows

### Current Task: Configure Development Environment
**Objective**: Set up all development tools and workflows for the monorepo.

**Requirements**:
1. Configure Rollup for each package with different output formats
2. Set up Jest testing environment with medical imaging test utilities
3. Configure TypeDoc for API documentation generation
4. Set up ESLint with medical imaging and accessibility rules
5. Add Prettier with consistent formatting across packages
6. Create Husky pre-commit hooks for quality checks
7. Design GitHub Actions workflow for CI/CD

**Build Configuration**:
- Output: CommonJS, ESM, UMD formats
- Tree-shaking optimization
- Source maps for debugging
- Bundle analysis and size monitoring

**Testing Setup**:
- Unit tests for core functionality
- Integration tests for package interactions
- Mock DICOM data for testing
- Coverage reports and thresholds

**Documentation**:
```typescript
// TypeDoc configuration example
{
  "entryPoints": ["packages/*/src/index.ts"],
  "out": "docs/api",
  "theme": "custom-medical",
  "includeVersion": true,
  "excludePrivate": true
}
```

**Instructions**:
- Configure build tools for optimal bundle sizes
- Set up comprehensive test suites with medical imaging scenarios
- Include accessibility testing for medical compliance
- Add performance testing for large DICOM files
- Create documentation templates for medical imaging context

**Output Format**: Configuration files and GitHub Actions workflows.

---

## General Guidelines for All Tasks

### Code Quality Standards
- **TypeScript**: Use strict mode, explicit return types, comprehensive interfaces
- **Documentation**: Include JSDoc for all public APIs with medical imaging context
- **Error Handling**: Implement proper error boundaries and medical-grade error reporting
- **Performance**: Optimize for large DICOM files (>100MB), implement lazy loading
- **Accessibility**: Follow WCAG 2.1 AA guidelines for medical applications

### Medical Imaging Specific Considerations
- **DICOM Compliance**: Ensure full DICOM standard compliance
- **Memory Management**: Handle large image datasets efficiently
- **Performance**: Sub-second image loading for typical clinical workflows
- **Security**: Implement proper PHI (Protected Health Information) handling
- **Internationalization**: Support for different measurement units and languages

### Zustand Best Practices
```typescript
// Store organization pattern
const useViewerStore = create<ViewerState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // State
        viewers: {},
        activeViewerId: null,
        
        // Actions
        createViewer: (config) => set((state) => {
          const id = generateId();
          state.viewers[id] = createViewerInstance(config);
          state.activeViewerId = id;
        }),
        
        // Selectors
        getActiveViewer: () => {
          const state = get();
          return state.activeViewerId ? state.viewers[state.activeViewerId] : null;
        }
      })),
      {
        name: 'dicom-viewer-store',
        partialize: (state) => ({ preferences: state.preferences }) // Only persist preferences
      }
    ),
    { name: 'viewer-store' }
  )
);
```

### Plugin Architecture Pattern
```typescript
// Plugin interface with medical imaging context
interface IDicomViewerPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  
  // Medical imaging specific
  supportedModalities: DicomModality[];
  requiredCapabilities: ViewerCapability[];
  
  // Lifecycle
  initialize(context: PluginContext): Promise<void>;
  activate(): Promise<void>;
  deactivate(): Promise<void>;
  dispose(): Promise<void>;
  
  // Services
  getServices(): PluginServices;
  getCommands(): PluginCommand[];
  getMenuItems(): MenuItem[];
}
```

---

## Prompt Best Practices for AI Code Editor

### 1. Context Setting Template
```
### Context & Role
You are a [SPECIFIC ROLE] with expertise in [DOMAIN]. You're working on [PROJECT DESCRIPTION].

### Current Situation  
- **Package**: @opendicom/[PACKAGE-NAME]
- **Phase**: [CURRENT PHASE]
- **Dependencies**: [LIST KEY DEPENDENCIES]
- **Architecture**: [ARCHITECTURAL PATTERN]
```

### 2. Task Definition Template
```
### Current Task: [CLEAR TASK NAME]
**Objective**: [ONE SENTENCE GOAL]

**Requirements**:
1. [SPECIFIC REQUIREMENT 1]
2. [SPECIFIC REQUIREMENT 2]
3. [SPECIFIC REQUIREMENT 3]

**Constraints**:
- [TECHNICAL CONSTRAINT]
- [BUSINESS CONSTRAINT]
- [PERFORMANCE CONSTRAINT]
```

### 3. Output Specification Template
```
**Instructions**:
- [SPECIFIC TECHNICAL INSTRUCTION]
- [CODE STYLE INSTRUCTION]  
- [ARCHITECTURE INSTRUCTION]

**Output Format**: [EXACTLY WHAT YOU WANT]
- File structure with clear naming
- TypeScript interfaces and implementations
- Configuration files with comments
- Shell commands for setup
```

### 4. Code Style Preferences
```
**Code Style Requirements**:
- Use explicit TypeScript types, avoid 'any'
- Prefer composition over inheritance
- Implement proper error handling with typed errors
- Include comprehensive JSDoc documentation
- Use functional programming patterns where appropriate
- Follow medical imaging naming conventions
```

---

## Advanced Prompting Strategies

### 1. Chain of Thought for Complex Tasks
"Let's think step by step:
1. First, analyze the requirements and dependencies
2. Then, design the interface contracts
3. Next, implement the core functionality
4. Finally, add error handling and documentation"

### 2. Iterative Refinement Pattern
"Start with a basic implementation, then we'll iteratively add:
- Error handling and validation
- Performance optimizations  
- Medical imaging specific features
- Comprehensive testing"

### 3. Medical Context Integration
"Consider medical imaging workflows where:
- Radiologists need sub-second image loading
- Images can be 100MB+ in size
- HIPAA compliance is mandatory
- Multiple modalities (CT, MRI, X-Ray) must be supported"

### 4. Example-Driven Development
"Here's an example of how this should be used:
```typescript
// Usage example
const viewer = useViewerStore();
viewer.createViewer({
  containerId: 'main-viewport',
  modality: 'CT',
  studyId: 'study-123'
});
```
Implement the store and methods to support this usage pattern."

---

## Debugging and Iteration Prompts

### When Code Doesn't Work
"The current implementation has issues with [SPECIFIC PROBLEM]. 
Let's debug step by step:
1. Identify the root cause
2. Propose 2-3 potential solutions
3. Implement the most robust solution
4. Add safeguards to prevent similar issues"

### When Requirements Change  
"The requirements have evolved. We now need to:
- [NEW REQUIREMENT 1]
- [NEW REQUIREMENT 2]

Please refactor the existing code to accommodate these changes while maintaining backward compatibility."

### For Performance Issues
"The current implementation is too slow for medical imaging workflows. 
Optimize for:
- Large DICOM files (100MB+)
- Multiple concurrent viewports
- Real-time interaction (pan, zoom, windowing)
- Memory efficiency for long sessions"

---

## Quality Assurance Prompts

### Code Review Simulation
"Review this code as if you're a senior medical imaging software architect:
- Check for DICOM standard compliance
- Verify memory management for large images
- Ensure proper error handling for clinical workflows
- Validate TypeScript type safety"

### Testing Strategy
"Create comprehensive tests for this code:
- Unit tests for core functionality
- Integration tests with mock DICOM data
- Performance tests with large datasets
- Edge cases for medical imaging scenarios"

### Documentation Requirements
"Generate documentation that includes:
- API reference with medical imaging examples
- Integration guide for different frameworks
- Performance optimization tips
- Troubleshooting guide for common issues"