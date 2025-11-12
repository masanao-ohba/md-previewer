#!/usr/bin/env node

/**
 * Validate Webview JavaScript Syntax
 *
 * This script validates that generated JavaScript in the Webview
 * does not contain syntax errors by actually generating the HTML
 * and checking it in a real browser-like environment.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Mock vscode module
const vscodeModule = {
  workspace: {
    getConfiguration: () => ({
      get: (key, defaultValue) => {
        if (key === 'preview.theme') return 'github-light';
        if (key === 'preview.debounceDelay') return 300;
        return defaultValue;
      }
    })
  },
  ViewColumn: { One: 1, Two: 2, Three: 3 },
  Uri: {
    file: (p) => ({ fsPath: p }),
    parse: (p) => ({ fsPath: p })
  },
  window: {
    createWebviewPanel: () => ({
      webview: { html: '', onDidDispose: () => {} },
      onDidDispose: () => {},
      reveal: () => {}
    })
  }
};

// Create require cache for vscode module
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id === 'vscode') {
    return vscodeModule;
  }
  return originalRequire.apply(this, arguments);
};

/**
 * Load PreviewPanel and generate HTML
 */
function generateWebviewHTML() {
  try {
    // Clear module cache
    delete require.cache[require.resolve('../../out/preview/PreviewPanel.js')];
    delete require.cache[require.resolve('../../out/themes/ThemeManager.js')];

    const { PreviewPanel } = require('../../out/preview/PreviewPanel.js');

    // Create mock context
    const mockContext = {
      extensionPath: path.join(__dirname, '../..'),
      extensionUri: { fsPath: path.join(__dirname, '../..') },
      subscriptions: []
    };

    // Generate HTML with test content
    const testContent = `
      <h1>Test</h1>
      <pre class="mermaid">
        graph TD
          A[Start] --> B[End]
      </pre>
    `;

    const mockDocument = {
      fileName: 'test.md',
      getText: () => testContent
    };

    // Create mock panel object with required methods
    const mockPanel = {
      webview: {
        html: '',
        onDidReceiveMessage: () => ({ dispose: () => {} })
      },
      onDidDispose: () => ({ dispose: () => {} }),
      reveal: () => {}
    };

    // Create PreviewPanel instance (panel, context, document)
    const previewPanel = new PreviewPanel(mockPanel, mockContext, mockDocument);

    // Call the private method using bracket notation
    const html = previewPanel['getWebviewHtml'](testContent, mockDocument);

    return html;

  } catch (error) {
    console.error('Failed to generate HTML:', error.message);
    throw error;
  }
}

/**
 * Extract script content from HTML
 */
function extractScripts(html) {
  const scripts = [];
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    const scriptContent = match[1].trim();
    if (scriptContent && !scriptContent.startsWith('http')) {
      scripts.push(scriptContent);
    }
  }

  return scripts;
}

/**
 * Validate JavaScript syntax using Node.js vm module
 */
function validateSyntax(scriptContent, index) {
  try {
    // Create a new Script instance to check syntax
    new vm.Script(scriptContent, {
      filename: `webview-script-${index}.js`,
      displayErrors: true
    });

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
      line: error.stack
    };
  }
}

/**
 * Count lines until a specific position in text
 */
function getLineNumber(text, position) {
  return text.substring(0, position).split('\n').length;
}

/**
 * Main validation
 */
function main() {
  console.log('🔍 Validating Webview JavaScript syntax...\n');

  try {
    // Generate HTML
    console.log('📄 Generating Webview HTML...');
    const html = generateWebviewHTML();
    console.log(`✓ Generated HTML (${html.length} characters)\n`);

    // Extract scripts
    console.log('📝 Extracting inline scripts...');
    const scripts = extractScripts(html);
    console.log(`✓ Found ${scripts.length} inline script(s)\n`);

    if (scripts.length === 0) {
      console.error('❌ No scripts found in generated HTML!');
      process.exit(1);
    }

    // Validate each script
    let hasErrors = false;

    scripts.forEach((script, index) => {
      console.log(`🔍 Validating script ${index + 1}/${scripts.length}...`);
      console.log(`   Length: ${script.length} characters`);

      const result = validateSyntax(script, index + 1);

      if (!result.valid) {
        hasErrors = true;
        console.error(`\n❌ SYNTAX ERROR in script ${index + 1}:\n`);
        console.error(result.error);
        console.error('\n' + result.line);
        console.error('\n');

        // Save problematic script for debugging
        const debugFile = path.join(__dirname, `../../debug-script-${index + 1}-error.js`);
        fs.writeFileSync(debugFile, script);
        console.error(`Debug: Saved problematic script to ${debugFile}\n`);

      } else {
        console.log(`✓ Script ${index + 1} - No syntax errors\n`);
      }
    });

    if (hasErrors) {
      console.error('❌ Validation FAILED - Syntax errors detected');
      process.exit(1);
    }

    console.log('✅ All Webview scripts validated successfully!');
    console.log('✅ No JavaScript syntax errors found');
    process.exit(0);

  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
