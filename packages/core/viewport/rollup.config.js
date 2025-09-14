/**
 * Rollup Configuration for @opendicom/viewport
 */

import { createConfig, medicalImagingExternals, medicalImagingGlobals } from '../../../rollup.config.base.js';

const packageExternals = [
  ...medicalImagingExternals,
  '@opendicom/core',
  '@opendicom/events',
  '@opendicom/image-loader'
];

const packageGlobals = {
  ...medicalImagingGlobals,
  '@opendicom/core': 'OpenDICOM.Core',
  '@opendicom/events': 'OpenDICOM.Events',
  '@opendicom/image-loader': 'OpenDICOM.ImageLoader'
};

export default createConfig({
  packageName: 'viewport',
  input: 'src/index.ts',
  external: packageExternals,
  globals: packageGlobals,
  browser: true,
  analyze: process.env.ANALYZE === 'true'
});