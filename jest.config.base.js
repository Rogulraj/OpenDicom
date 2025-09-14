/**
 * Base Jest Configuration for OpenDICOM Packages
 * Provides testing setup for medical imaging applications
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ],
  
  // Module name mapping for workspace packages
  moduleNameMapping: {
    '^@opendicom/core$': '<rootDir>/packages/core/core/src',
    '^@opendicom/events$': '<rootDir>/packages/core/events/src',
    '^@opendicom/image-loader$': '<rootDir>/packages/core/image-loader/src',
    '^@opendicom/ui$': '<rootDir>/packages/core/ui/src',
    '^@opendicom/viewport$': '<rootDir>/packages/core/viewport/src',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^~/(.*)$': '<rootDir>/$1'
  },
  
  // File extensions to consider
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node'
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }],
    '^.+\\.(js|jsx)$': 'babel-jest',
    '^.+\\.css$': 'jest-transform-css',
    '^.+\\.(png|jpg|jpeg|gif|webp|svg)$': 'jest-transform-file'
  },
  
  // Files to ignore during transformation
  transformIgnorePatterns: [
    'node_modules/(?!(cornerstone-core|cornerstone-math|cornerstone-tools|dcmjs|dicom-parser)/)',
    '\\.pnp\\.[^\\\\]+$'
  ],
  
  // Test match patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx|js)',
    '<rootDir>/packages/**/src/**/__tests__/**/*.(ts|tsx|js)',
    '<rootDir>/packages/**/src/**/*.(test|spec).(ts|tsx|js)'
  ],
  
  // Files to ignore
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/coverage/'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'packages/**/src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/test/**',
    '!packages/**/src/**/*.d.ts',
    '!packages/**/src/**/*.stories.{ts,tsx}',
    '!packages/**/src/**/__tests__/**',
    '!packages/**/src/**/test/**'
  ],
  
  // Coverage thresholds for medical imaging applications
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // Higher thresholds for critical medical imaging components
    './packages/core/core/src/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './packages/core/image-loader/src/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'clover',
    'json-summary'
  ],
  
  // Coverage directory
  coverageDirectory: '<rootDir>/coverage',
  
  // Global test timeout (important for large DICOM file processing)
  testTimeout: 30000,
  
  // Maximum worker processes
  maxWorkers: '50%',
  
  // Verbose output
  verbose: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Global variables for medical imaging tests
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx'
      }
    },
    // DICOM test constants
    DICOM_TEST_TIMEOUT: 10000,
    LARGE_FILE_TIMEOUT: 30000,
    PERFORMANCE_THRESHOLD_MS: 1000
  },
  
  // Custom test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  
  // Module directories
  moduleDirectories: [
    'node_modules',
    '<rootDir>/src',
    '<rootDir>/packages',
    '<rootDir>/test/utils'
  ],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Reset modules between tests
  resetModules: true
};