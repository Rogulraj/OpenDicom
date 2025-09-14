const baseConfig = require('../../../jest.config.base.js');

module.exports = {
  ...baseConfig,
  displayName: '@opendicom/viewport',
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(test|spec).(ts|tsx|js|jsx)',
    '<rootDir>/src/**/?(*.)(test|spec).(ts|tsx|js|jsx)'
  ],
  collectCoverageFrom: [
    'src/**/*.(ts|tsx)',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  moduleNameMapping: {
    ...baseConfig.moduleNameMapping,
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  // Viewport-specific testing environment
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [
    ...baseConfig.setupFilesAfterEnv,
    '<rootDir>/src/__tests__/setup/viewport.setup.ts'
  ],
  // Extended timeout for viewport rendering tests
  testTimeout: 15000
};