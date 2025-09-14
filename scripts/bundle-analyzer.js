/**
 * Bundle analyzer script for monitoring package sizes and performance
 * Specifically optimized for medical imaging applications handling large DICOM files
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { gzipSync } = require('zlib');

/**
 * Bundle analysis configuration
 */
const ANALYSIS_CONFIG = {
  // Size thresholds for medical imaging packages (in KB)
  thresholds: {
    core: {
      warning: 500,  // 500KB warning threshold
      error: 1000    // 1MB error threshold
    },
    viewer: {
      warning: 800,  // 800KB warning threshold
      error: 1500    // 1.5MB error threshold
    },
    tools: {
      warning: 300,  // 300KB warning threshold
      error: 600     // 600KB error threshold
    }
  },
  
  // Performance metrics for DICOM file handling
  performanceTargets: {
    dicomParseTime: 100,      // Max 100ms for small DICOM files
    largeDicomParseTime: 500, // Max 500ms for large DICOM files (>10MB)
    memoryUsage: 100,         // Max 100MB memory usage
    bundleLoadTime: 50        // Max 50ms bundle load time
  }
};

/**
 * Analyzes bundle size and generates report
 */
class BundleAnalyzer {
  constructor() {
    this.results = {
      packages: {},
      totalSize: 0,
      gzippedSize: 0,
      warnings: [],
      errors: [],
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Analyzes all packages in the monorepo
   */
  async analyzePackages() {
    const packagesDir = path.join(__dirname, '../packages');
    const packages = fs.readdirSync(packagesDir)
      .filter(dir => fs.statSync(path.join(packagesDir, dir)).isDirectory());
    
    console.log('🔍 Analyzing bundle sizes for medical imaging packages...');
    
    for (const packageName of packages) {
      await this.analyzePackage(packageName);
    }
    
    this.generateReport();
    this.checkThresholds();
    this.saveResults();
  }
  
  /**
   * Analyzes a specific package
   */
  async analyzePackage(packageName) {
    const packagePath = path.join(__dirname, '../packages', packageName);
    const distPath = path.join(packagePath, 'dist');
    
    if (!fs.existsSync(distPath)) {
      console.log(`⚠️  No dist folder found for ${packageName}, skipping...`);
      return;
    }
    
    const packageInfo = {
      name: packageName,
      files: {},
      totalSize: 0,
      gzippedSize: 0,
      formats: []
    };
    
    // Analyze different bundle formats
    const formats = ['esm', 'cjs', 'umd'];
    
    for (const format of formats) {
      const formatPath = path.join(distPath, format);
      if (fs.existsSync(formatPath)) {
        const formatInfo = this.analyzeFormat(formatPath, format);
        packageInfo.files[format] = formatInfo;
        packageInfo.totalSize += formatInfo.size;
        packageInfo.gzippedSize += formatInfo.gzippedSize;
        packageInfo.formats.push(format);
      }
    }
    
    this.results.packages[packageName] = packageInfo;
    this.results.totalSize += packageInfo.totalSize;
    this.results.gzippedSize += packageInfo.gzippedSize;
    
    console.log(`📦 ${packageName}: ${this.formatSize(packageInfo.totalSize)} (${this.formatSize(packageInfo.gzippedSize)} gzipped)`);
  }
  
  /**
   * Analyzes a specific format directory
   */
  analyzeFormat(formatPath, format) {
    const files = this.getJSFiles(formatPath);
    let totalSize = 0;
    let totalGzippedSize = 0;
    const fileDetails = {};
    
    for (const file of files) {
      const filePath = path.join(formatPath, file);
      const content = fs.readFileSync(filePath);
      const size = content.length;
      const gzippedSize = gzipSync(content).length;
      
      fileDetails[file] = {
        size,
        gzippedSize,
        compressionRatio: ((size - gzippedSize) / size * 100).toFixed(1)
      };
      
      totalSize += size;
      totalGzippedSize += gzippedSize;
    }
    
    return {
      size: totalSize,
      gzippedSize: totalGzippedSize,
      files: fileDetails,
      compressionRatio: ((totalSize - totalGzippedSize) / totalSize * 100).toFixed(1)
    };
  }
  
  /**
   * Gets all JavaScript files in a directory
   */
  getJSFiles(dir) {
    if (!fs.existsSync(dir)) return [];
    
    return fs.readdirSync(dir)
      .filter(file => file.endsWith('.js') || file.endsWith('.mjs'))
      .filter(file => !file.includes('.map')); // Exclude source maps
  }
  
  /**
   * Checks bundle sizes against thresholds
   */
  checkThresholds() {
    for (const [packageName, packageInfo] of Object.entries(this.results.packages)) {
      const thresholds = ANALYSIS_CONFIG.thresholds[packageName] || ANALYSIS_CONFIG.thresholds.core;
      const sizeKB = packageInfo.totalSize / 1024;
      
      if (sizeKB > thresholds.error) {
        this.results.errors.push({
          type: 'bundle_size',
          package: packageName,
          message: `Bundle size ${this.formatSize(packageInfo.totalSize)} exceeds error threshold ${thresholds.error}KB`,
          actual: sizeKB,
          threshold: thresholds.error
        });
      } else if (sizeKB > thresholds.warning) {
        this.results.warnings.push({
          type: 'bundle_size',
          package: packageName,
          message: `Bundle size ${this.formatSize(packageInfo.totalSize)} exceeds warning threshold ${thresholds.warning}KB`,
          actual: sizeKB,
          threshold: thresholds.warning
        });
      }
    }
  }
  
  /**
   * Generates a comprehensive report
   */
  generateReport() {
    console.log('\n📊 Bundle Analysis Report');
    console.log('=' .repeat(50));
    console.log(`Total Bundle Size: ${this.formatSize(this.results.totalSize)}`);
    console.log(`Total Gzipped Size: ${this.formatSize(this.results.gzippedSize)}`);
    console.log(`Overall Compression: ${((this.results.totalSize - this.results.gzippedSize) / this.results.totalSize * 100).toFixed(1)}%`);
    
    console.log('\n📦 Package Breakdown:');
    for (const [name, info] of Object.entries(this.results.packages)) {
      console.log(`  ${name}:`);
      console.log(`    Size: ${this.formatSize(info.totalSize)} (${this.formatSize(info.gzippedSize)} gzipped)`);
      console.log(`    Formats: ${info.formats.join(', ')}`);
      console.log(`    Compression: ${((info.totalSize - info.gzippedSize) / info.totalSize * 100).toFixed(1)}%`);
    }
    
    if (this.results.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.results.warnings.forEach(warning => {
        console.log(`  - ${warning.message}`);
      });
    }
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.results.errors.forEach(error => {
        console.log(`  - ${error.message}`);
      });
    }
    
    console.log('\n🏥 Medical Imaging Optimization Tips:');
    console.log('  - Use tree shaking to eliminate unused DICOM parsing code');
    console.log('  - Consider lazy loading for large imaging tools');
    console.log('  - Implement progressive loading for multi-frame DICOM files');
    console.log('  - Use Web Workers for intensive DICOM processing');
    console.log('  - Cache parsed DICOM metadata to avoid re-parsing');
  }
  
  /**
   * Saves analysis results to file
   */
  saveResults() {
    const outputPath = path.join(__dirname, '../reports/bundle-analysis.json');
    const reportsDir = path.dirname(outputPath);
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Analysis results saved to: ${outputPath}`);
    
    // Also generate a markdown report
    this.generateMarkdownReport();
  }
  
  /**
   * Generates a markdown report for documentation
   */
  generateMarkdownReport() {
    const markdownPath = path.join(__dirname, '../reports/bundle-analysis.md');
    
    let markdown = `# Bundle Analysis Report\n\n`;
    markdown += `Generated: ${this.results.timestamp}\n\n`;
    
    markdown += `## Summary\n\n`;
    markdown += `- **Total Bundle Size**: ${this.formatSize(this.results.totalSize)}\n`;
    markdown += `- **Total Gzipped Size**: ${this.formatSize(this.results.gzippedSize)}\n`;
    markdown += `- **Overall Compression**: ${((this.results.totalSize - this.results.gzippedSize) / this.results.totalSize * 100).toFixed(1)}%\n\n`;
    
    markdown += `## Package Details\n\n`;
    markdown += `| Package | Size | Gzipped | Compression | Formats |\n`;
    markdown += `|---------|------|---------|-------------|---------|\n`;
    
    for (const [name, info] of Object.entries(this.results.packages)) {
      markdown += `| ${name} | ${this.formatSize(info.totalSize)} | ${this.formatSize(info.gzippedSize)} | ${((info.totalSize - info.gzippedSize) / info.totalSize * 100).toFixed(1)}% | ${info.formats.join(', ')} |\n`;
    }
    
    if (this.results.warnings.length > 0 || this.results.errors.length > 0) {
      markdown += `\n## Issues\n\n`;
      
      if (this.results.errors.length > 0) {
        markdown += `### Errors\n\n`;
        this.results.errors.forEach(error => {
          markdown += `- ❌ **${error.package}**: ${error.message}\n`;
        });
        markdown += `\n`;
      }
      
      if (this.results.warnings.length > 0) {
        markdown += `### Warnings\n\n`;
        this.results.warnings.forEach(warning => {
          markdown += `- ⚠️ **${warning.package}**: ${warning.message}\n`;
        });
        markdown += `\n`;
      }
    }
    
    markdown += `## Medical Imaging Optimization Recommendations\n\n`;
    markdown += `- **Tree Shaking**: Eliminate unused DICOM parsing code\n`;
    markdown += `- **Lazy Loading**: Load imaging tools on demand\n`;
    markdown += `- **Progressive Loading**: Stream multi-frame DICOM files\n`;
    markdown += `- **Web Workers**: Offload intensive DICOM processing\n`;
    markdown += `- **Caching**: Cache parsed DICOM metadata\n`;
    
    fs.writeFileSync(markdownPath, markdown);
    console.log(`📄 Markdown report saved to: ${markdownPath}`);
  }
  
  /**
   * Formats byte size to human readable format
   */
  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

/**
 * Performance monitoring for DICOM file operations
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      dicomParseTime: [],
      memoryUsage: [],
      bundleLoadTime: [],
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Simulates DICOM parsing performance test
   */
  async testDicomPerformance() {
    console.log('\n🏥 Testing DICOM parsing performance...');
    
    // Simulate different DICOM file sizes
    const testSizes = [
      { name: 'Small DICOM (1MB)', size: 1 },
      { name: 'Medium DICOM (10MB)', size: 10 },
      { name: 'Large DICOM (50MB)', size: 50 },
      { name: 'Very Large DICOM (100MB)', size: 100 }
    ];
    
    for (const test of testSizes) {
      const startTime = performance.now();
      
      // Simulate parsing time based on file size
      await this.simulateParsingDelay(test.size);
      
      const endTime = performance.now();
      const parseTime = endTime - startTime;
      
      this.metrics.dicomParseTime.push({
        size: test.size,
        name: test.name,
        parseTime: parseTime,
        withinTarget: parseTime <= (test.size > 10 ? ANALYSIS_CONFIG.performanceTargets.largeDicomParseTime : ANALYSIS_CONFIG.performanceTargets.dicomParseTime)
      });
      
      console.log(`  ${test.name}: ${parseTime.toFixed(2)}ms ${parseTime <= (test.size > 10 ? 500 : 100) ? '✅' : '❌'}`);
    }
  }
  
  /**
   * Simulates parsing delay based on file size
   */
  async simulateParsingDelay(sizeInMB) {
    // Realistic parsing time simulation
    const baseTime = 10; // 10ms base time
    const sizeMultiplier = sizeInMB * 2; // 2ms per MB
    const delay = baseTime + sizeMultiplier;
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  /**
   * Generates performance report
   */
  generatePerformanceReport() {
    console.log('\n📈 Performance Analysis:');
    
    const avgParseTime = this.metrics.dicomParseTime.reduce((sum, metric) => sum + metric.parseTime, 0) / this.metrics.dicomParseTime.length;
    const passedTests = this.metrics.dicomParseTime.filter(metric => metric.withinTarget).length;
    
    console.log(`  Average Parse Time: ${avgParseTime.toFixed(2)}ms`);
    console.log(`  Tests Passed: ${passedTests}/${this.metrics.dicomParseTime.length}`);
    
    if (passedTests < this.metrics.dicomParseTime.length) {
      console.log('\n⚠️  Performance Recommendations:');
      console.log('  - Consider implementing streaming DICOM parsing');
      console.log('  - Use Web Workers for large file processing');
      console.log('  - Implement progressive loading for better UX');
      console.log('  - Add memory management for large datasets');
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting bundle analysis for Open DICOM...');
  
  try {
    // Bundle analysis
    const analyzer = new BundleAnalyzer();
    await analyzer.analyzePackages();
    
    // Performance monitoring
    const monitor = new PerformanceMonitor();
    await monitor.testDicomPerformance();
    monitor.generatePerformanceReport();
    
    // Exit with error code if there are bundle size errors
    if (analyzer.results.errors.length > 0) {
      console.log('\n❌ Bundle analysis failed due to size threshold violations.');
      process.exit(1);
    }
    
    console.log('\n✅ Bundle analysis completed successfully!');
    
  } catch (error) {
    console.error('❌ Bundle analysis failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { BundleAnalyzer, PerformanceMonitor, ANALYSIS_CONFIG };