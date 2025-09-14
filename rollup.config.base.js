/**
 * Base Rollup Configuration for OpenDICOM Packages
 * Provides CommonJS, ESM, and UMD builds with optimization
 */

import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import analyze from 'rollup-plugin-analyzer';
import filesize from 'rollup-plugin-filesize';
import json from '@rollup/plugin-json';
import replace from '@rollup/plugin-replace';
import { visualizer } from 'rollup-plugin-visualizer';

/**
 * Create Rollup configuration for a package
 * @param {Object} options - Configuration options
 * @param {string} options.packageName - Package name (e.g., 'core', 'events')
 * @param {string} options.input - Entry point file
 * @param {Object} options.external - External dependencies
 * @param {Object} options.globals - Global variable names for UMD build
 * @param {boolean} options.browser - Whether to create browser-optimized build
 * @param {boolean} options.analyze - Whether to analyze bundle
 * @returns {Array} Rollup configuration array
 */
export function createConfig({
  packageName,
  input = 'src/index.ts',
  external = [],
  globals = {},
  browser = true,
  analyze = false
}) {
  const isProduction = process.env.NODE_ENV === 'production';
  const outputDir = 'dist';
  
  // Common plugins
  const basePlugins = [
    // Replace environment variables
    replace({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.PACKAGE_VERSION': JSON.stringify(process.env.npm_package_version || '0.0.0'),
      preventAssignment: true
    }),
    
    // Resolve node modules
    resolve({
      browser: true,
      preferBuiltins: false,
      exportConditions: ['node']
    }),
    
    // Convert CommonJS modules to ES6
    commonjs({
      include: /node_modules/
    }),
    
    // Handle JSON imports
    json(),
    
    // TypeScript compilation
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: `${outputDir}/types`,
      rootDir: 'src',
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/test/**/*']
    }),
    
    // File size reporting
    filesize({
      showMinifiedSize: true,
      showGzippedSize: true
    })
  ];
  
  // Production plugins
  const productionPlugins = [
    terser({
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug']
      },
      mangle: {
        reserved: ['DicomViewer', 'OpenDICOM']
      },
      format: {
        comments: false
      }
    })
  ];
  
  // Analysis plugins
  const analysisPlugins = analyze ? [
    analyze({
      summaryOnly: true,
      limit: 10
    }),
    visualizer({
      filename: `${outputDir}/bundle-analysis.html`,
      open: false,
      gzipSize: true,
      brotliSize: true
    })
  ] : [];
  
  const configs = [];
  
  // ESM Build
  configs.push({
    input,
    external,
    output: {
      file: `${outputDir}/${packageName}.esm.js`,
      format: 'es',
      sourcemap: true,
      exports: 'named'
    },
    plugins: [
      ...basePlugins,
      ...(isProduction ? productionPlugins : []),
      ...analysisPlugins
    ]
  });
  
  // CommonJS Build
  configs.push({
    input,
    external,
    output: {
      file: `${outputDir}/${packageName}.cjs.js`,
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    plugins: [
      ...basePlugins,
      ...(isProduction ? productionPlugins : [])
    ]
  });
  
  // UMD Build (for browser)
  if (browser) {
    configs.push({
      input,
      external: Object.keys(globals),
      output: {
        file: `${outputDir}/${packageName}.umd.js`,
        format: 'umd',
        name: `OpenDICOM.${packageName.charAt(0).toUpperCase() + packageName.slice(1)}`,
        globals,
        sourcemap: true,
        exports: 'named'
      },
      plugins: [
        ...basePlugins,
        ...(isProduction ? productionPlugins : [])
      ]
    });
    
    // Minified UMD Build
    if (isProduction) {
      configs.push({
        input,
        external: Object.keys(globals),
        output: {
          file: `${outputDir}/${packageName}.umd.min.js`,
          format: 'umd',
          name: `OpenDICOM.${packageName.charAt(0).toUpperCase() + packageName.slice(1)}`,
          globals,
          sourcemap: true,
          exports: 'named'
        },
        plugins: [
          ...basePlugins,
          ...productionPlugins
        ]
      });
    }
  }
  
  return configs;
}

/**
 * Default external dependencies for medical imaging packages
 */
export const medicalImagingExternals = [
  'cornerstone-core',
  'cornerstone-math',
  'cornerstone-tools',
  'dcmjs',
  'dicom-parser',
  'react',
  'react-dom',
  'zustand',
  'immer',
  'zod'
];

/**
 * Default globals for UMD builds
 */
export const medicalImagingGlobals = {
  'cornerstone-core': 'cornerstone',
  'cornerstone-math': 'cornerstoneMath',
  'cornerstone-tools': 'cornerstoneTools',
  'dcmjs': 'dcmjs',
  'dicom-parser': 'dicomParser',
  'react': 'React',
  'react-dom': 'ReactDOM',
  'zustand': 'zustand',
  'immer': 'immer',
  'zod': 'zod'
};

/**
 * Bundle size limits for different package types
 */
export const bundleSizeLimits = {
  core: {
    esm: '150kb',
    cjs: '160kb',
    umd: '200kb'
  },
  events: {
    esm: '50kb',
    cjs: '55kb',
    umd: '70kb'
  },
  'image-loader': {
    esm: '100kb',
    cjs: '110kb',
    umd: '140kb'
  },
  ui: {
    esm: '200kb',
    cjs: '220kb',
    umd: '280kb'
  },
  viewport: {
    esm: '120kb',
    cjs: '130kb',
    umd: '160kb'
  }
};

/**
 * Performance optimization settings for large DICOM files
 */
export const performanceOptimizations = {
  // Tree-shaking configuration
  treeshake: {
    moduleSideEffects: false,
    propertyReadSideEffects: false,
    tryCatchDeoptimization: false
  },
  
  // Code splitting for large packages
  experimentalCodeSplitting: true,
  
  // Chunk size limits
  chunkSizeWarningLimit: 500, // 500kb
  
  // Lazy loading configuration
  lazyLoading: {
    enabled: true,
    chunkSize: 100 // 100kb chunks
  }
};