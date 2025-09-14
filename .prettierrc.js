module.exports = {
  // Basic formatting
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  quoteProps: 'as-needed',
  jsxSingleQuote: true,
  
  // Indentation
  tabWidth: 2,
  useTabs: false,
  
  // Line length
  printWidth: 100,
  
  // Bracket spacing
  bracketSpacing: true,
  bracketSameLine: false,
  
  // Arrow functions
  arrowParens: 'avoid',
  
  // End of line
  endOfLine: 'lf',
  
  // Embedded language formatting
  embeddedLanguageFormatting: 'auto',
  
  // HTML whitespace sensitivity
  htmlWhitespaceSensitivity: 'css',
  
  // Insert pragma
  insertPragma: false,
  requirePragma: false,
  
  // Prose wrap
  proseWrap: 'preserve',
  
  // Vue files
  vueIndentScriptAndStyle: false,
  
  // Plugin-specific options
  plugins: [
    '@trivago/prettier-plugin-sort-imports',
    'prettier-plugin-organize-attributes',
    'prettier-plugin-tailwindcss'
  ],
  
  // Import sorting configuration
  importOrder: [
    '^react$',
    '^react/(.*)$',
    '^next/(.*)$',
    '<THIRD_PARTY_MODULES>',
    '^@opendicom/(.*)$',
    '^@/(.*)$',
    '^[./]'
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  importOrderBuiltinModulesToTop: true,
  importOrderParserPlugins: ['typescript', 'jsx', 'decorators-legacy'],
  importOrderMergeDuplicateImports: true,
  importOrderCombineTypeAndValueImports: true,
  
  // Attribute organization for JSX/HTML
  attributeGroups: [
    '$DEFAULT',
    ['className', 'class'],
    'data-*',
    'aria-*'
  ],
  
  // Override settings for specific file types
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always',
        tabWidth: 2
      }
    },
    {
      files: '*.yml',
      options: {
        tabWidth: 2,
        singleQuote: false
      }
    },
    {
      files: '*.yaml',
      options: {
        tabWidth: 2,
        singleQuote: false
      }
    },
    {
      files: ['*.ts', '*.tsx'],
      options: {
        parser: 'typescript',
        printWidth: 100,
        tabWidth: 2,
        semi: true,
        singleQuote: true,
        trailingComma: 'es5'
      }
    },
    {
      files: ['*.js', '*.jsx'],
      options: {
        parser: 'babel',
        printWidth: 100,
        tabWidth: 2,
        semi: true,
        singleQuote: true,
        trailingComma: 'es5'
      }
    },
    {
      files: '*.css',
      options: {
        parser: 'css',
        printWidth: 120,
        tabWidth: 2,
        singleQuote: false
      }
    },
    {
      files: '*.scss',
      options: {
        parser: 'scss',
        printWidth: 120,
        tabWidth: 2,
        singleQuote: false
      }
    },
    {
      files: '*.html',
      options: {
        parser: 'html',
        printWidth: 120,
        tabWidth: 2,
        htmlWhitespaceSensitivity: 'ignore'
      }
    },
    {
      files: 'package.json',
      options: {
        printWidth: 120,
        tabWidth: 2,
        plugins: []
      }
    },
    {
      files: '*.config.{js,ts}',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: ['rollup.config.*', 'webpack.config.*', 'vite.config.*'],
      options: {
        printWidth: 120,
        tabWidth: 2,
        singleQuote: true
      }
    },
    {
      files: ['*.test.{js,ts,tsx}', '*.spec.{js,ts,tsx}'],
      options: {
        printWidth: 120,
        tabWidth: 2,
        singleQuote: true,
        // Allow longer lines in tests for readability
        printWidth: 140
      }
    },
    {
      files: ['docs/**/*.md', 'README.md', 'CHANGELOG.md'],
      options: {
        printWidth: 80,
        proseWrap: 'always',
        tabWidth: 2,
        // Preserve markdown formatting
        embeddedLanguageFormatting: 'off'
      }
    }
  ]
};