module.exports = {
  // TypeScript and JavaScript files
  '*.{ts,tsx,js,jsx}': [
    'eslint --fix',
    'prettier --write',
    'git add'
  ],
  
  // JSON files
  '*.json': [
    'prettier --write',
    'git add'
  ],
  
  // Markdown files
  '*.md': [
    'prettier --write',
    'git add'
  ],
  
  // CSS and SCSS files
  '*.{css,scss}': [
    'prettier --write',
    'git add'
  ],
  
  // YAML files (for GitHub Actions)
  '*.{yml,yaml}': [
    'prettier --write',
    'git add'
  ],
  
  // Package.json files - run dependency audit
  'package.json': [
    'npm audit --audit-level=moderate',
    'prettier --write',
    'git add'
  ],
  
  // Medical imaging specific checks
  '**/*.{ts,tsx}': [
    // Check for hardcoded patient data patterns
    'grep -L "patient.*id\|mrn\|ssn" || echo "Warning: Potential patient data detected"',
    // Ensure DICOM handling follows security practices
    'grep -L "password\|secret\|key" || echo "Warning: Potential secrets detected"'
  ]
};