/**
 * Rollup Configuration for @opendicom/events
 */

import { createConfig, medicalImagingExternals, medicalImagingGlobals } from '../../../rollup.config.base.js';

const packageExternals = [
  'eventemitter3',
  'zod'
];

const packageGlobals = {
  'eventemitter3': 'EventEmitter3',
  'zod': 'zod'
};

export default createConfig({
  packageName: 'events',
  input: 'src/index.ts',
  external: packageExternals,
  globals: packageGlobals,
  browser: true,
  analyze: process.env.ANALYZE === 'true'
});