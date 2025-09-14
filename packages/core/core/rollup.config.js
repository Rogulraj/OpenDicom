/**
 * Rollup Configuration for @opendicom/core
 */

import { createConfig, medicalImagingExternals, medicalImagingGlobals } from '../../../rollup.config.base.js';

const packageExternals = [
  ...medicalImagingExternals,
  '@opendicom/events'
];

const packageGlobals = {
  ...medicalImagingGlobals,
  '@opendicom/events': 'OpenDICOM.Events'
};

export default createConfig({
  packageName: 'core',
  input: 'src/index.ts',
  external: packageExternals,
  globals: packageGlobals,
  browser: true,
  analyze: process.env.ANALYZE === 'true'
});