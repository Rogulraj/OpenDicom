/**
 * Webpack configuration for bundle analysis
 * Optimized for medical imaging applications with large DICOM files
 */

const path = require('path');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = {
  mode: 'production',
  
  entry: {
    'dicom-core': './packages/core/src/index.ts',
    'dicom-viewer': './packages/viewer/src/index.ts',
    'dicom-tools': './packages/tools/src/index.ts'
  },
  
  output: {
    path: path.resolve(__dirname, 'dist-analysis'),
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js',
    clean: true
  },
  
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@open-dicom/core': path.resolve(__dirname, 'packages/core/src'),
      '@open-dicom/viewer': path.resolve(__dirname, 'packages/viewer/src'),
      '@open-dicom/tools': path.resolve(__dirname, 'packages/tools/src')
    }
  },
  
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              configFile: path.resolve(__dirname, 'tsconfig.json')
            }
          }
        ],
        exclude: /node_modules/
      },
      {
        test: /\.(js|jsx)$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: 'defaults' }],
              '@babel/preset-react'
            ]
          }
        },
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name].[hash][ext]'
        }
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[hash][ext]'
        }
      }
    ]
  },
  
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Separate vendor libraries
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10
        },
        
        // DICOM-specific libraries
        dicom: {
          test: /[\\/]node_modules[\\/](dicom|dcmjs|cornerstone|ohif)[\\/]/,
          name: 'dicom-libs',
          chunks: 'all',
          priority: 20
        },
        
        // React and related libraries
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'react',
          chunks: 'all',
          priority: 15
        },
        
        // Common utilities
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 5,
          reuseExistingChunk: true
        }
      }
    },
    
    // Enable tree shaking
    usedExports: true,
    sideEffects: false,
    
    // Minimize bundle size
    minimize: true
  },
  
  plugins: [
    // Bundle analyzer with medical imaging specific configuration
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: 'bundle-report.html',
      openAnalyzer: false,
      generateStatsFile: true,
      statsFilename: 'bundle-stats.json',
      statsOptions: {
        source: false,
        modules: true,
        chunks: true,
        chunkModules: true,
        chunkOrigins: true,
        reasons: true,
        usedExports: true,
        providedExports: true,
        optimizationBailout: true,
        errorDetails: true,
        publicPath: true,
        exclude: /node_modules/
      }
    }),
    
    // Compression analysis
    new CompressionPlugin({
      filename: '[path][base].gz',
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8
    }),
    
    // Brotli compression for better performance
    new CompressionPlugin({
      filename: '[path][base].br',
      algorithm: 'brotliCompress',
      test: /\.(js|css|html|svg)$/,
      compressionOptions: {
        level: 11
      },
      threshold: 8192,
      minRatio: 0.8
    })
  ],
  
  // Performance budgets for medical imaging applications
  performance: {
    maxAssetSize: 1000000,    // 1MB max asset size
    maxEntrypointSize: 1500000, // 1.5MB max entrypoint size
    hints: 'warning',
    
    // Custom performance hints for DICOM applications
    assetFilter: function(assetFilename) {
      // Exclude large DICOM test files from performance checks
      return !assetFilename.endsWith('.dcm') && !assetFilename.endsWith('.dicom');
    }
  },
  
  // Source maps for debugging
  devtool: 'source-map',
  
  // Stats configuration for detailed analysis
  stats: {
    colors: true,
    modules: true,
    chunks: true,
    chunkModules: true,
    chunkOrigins: true,
    reasons: true,
    usedExports: true,
    providedExports: true,
    optimizationBailout: true,
    errorDetails: true,
    
    // Medical imaging specific stats
    assets: true,
    assetsSort: 'size',
    modulesSort: 'size',
    chunksSort: 'size'
  },
  
  // External dependencies that shouldn't be bundled
  externals: {
    // Large medical imaging libraries that should be loaded separately
    'cornerstone-core': 'cornerstone',
    'cornerstone-tools': 'cornerstoneTools',
    'dicom-parser': 'dicomParser'
  }
};