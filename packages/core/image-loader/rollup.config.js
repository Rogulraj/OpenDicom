/**
 * Rollup Configuration for @opendicom/image-loader
 */

import { createConfig, medicalImagingExternals, medicalImagingGlobals } from '../../../rollup.config.base.js';

const packageExternals = [
  ...medicalImagingExternals,
  '@opendicom/core',
  '@opendicom/events'
];

const packageGlobals = {
  ...medicalImagingGlobals,
  '@opendicom/core': 'OpenDICOM.Core',
  '@opendicom/events': 'OpenDICOM.Events'
};

export default createConfig({
  packageName: 'image-loader',
  input: 'src/index.ts',
  external: packageExternals,
  globals: packageGlobals,
  browser: true,
  analyze: process.env.ANALYZE === 'true'
});