/**
 * E2E test for Webview JavaScript syntax validation
 *
 * This test ensures that all generated JavaScript in the Webview
 * is syntactically correct and executes without errors.
 */

import { test, expect } from '@playwright/test';
import { PreviewPanel } from '../../src/preview/PreviewPanel';
import * as vscode from 'vscode';

// Mock VSCode API
const mockContext: any = {
  extensionPath: __dirname + '/../..',
  extensionUri: vscode.Uri.file(__dirname + '/../..'),
  subscriptions: []
};

const mockDocument: any = {
  fileName: 'test.md',
  getText: () => `
# Test Document

\`\`\`mermaid
graph TD
  A[Start] --> B[End]
\`\`\`

\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\`
  `
};

test.describe('Webview JavaScript Syntax', () => {

  test('generated HTML should not contain syntax errors', async ({ page }) => {
    // Create PreviewPanel instance (this will fail without proper mocking)
    // For now, we'll generate the HTML directly
    const panel = new PreviewPanel(mockContext, vscode.ViewColumn.One);

    // Get generated HTML
    const html = (panel as any).getWebviewHtml('<h1>Test</h1>', mockDocument);

    // Set HTML content
    await page.setContent(html, {
      waitUntil: 'networkidle'
    });

    // Check for console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait for scripts to execute
    await page.waitForTimeout(1000);

    // Check for syntax errors
    const syntaxErrors = errors.filter(err =>
      err.includes('SyntaxError') ||
      err.includes('Uncaught')
    );

    expect(syntaxErrors,
      `Found JavaScript syntax errors:\n${syntaxErrors.join('\n')}`
    ).toHaveLength(0);
  });

  test('diagram click handlers should be registered', async ({ page }) => {
    const panel = new PreviewPanel(mockContext, vscode.ViewColumn.One);
    const html = (panel as any).getWebviewHtml(`
      <div class="diagram-clickable mermaid-container" data-diagram-type="mermaid">
        <svg>Test</svg>
      </div>
    `, mockDocument);

    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Check if .diagram-clickable elements exist
    const clickableCount = await page.evaluate(() => {
      return document.querySelectorAll('.diagram-clickable').length;
    });

    expect(clickableCount).toBeGreaterThan(0);
  });

  test('modal should open when diagram is clicked', async ({ page }) => {
    const panel = new PreviewPanel(mockContext, vscode.ViewColumn.One);
    const html = (panel as any).getWebviewHtml(`
      <div class="diagram-clickable mermaid-container" data-diagram-type="mermaid">
        <div id="mermaid-output-0">
          <svg width="100" height="100">
            <rect width="100" height="100" fill="blue"/>
          </svg>
        </div>
      </div>
    `, mockDocument);

    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Click diagram
    await page.click('.diagram-clickable');

    // Wait for modal
    await page.waitForSelector('#diagram-modal.modal-visible', { timeout: 5000 });

    // Verify modal is visible
    const isVisible = await page.evaluate(() => {
      const modal = document.getElementById('diagram-modal');
      return modal?.classList.contains('modal-visible');
    });

    expect(isVisible).toBe(true);
  });

  test('template literals in error messages should be properly escaped', async ({ page }) => {
    const panel = new PreviewPanel(mockContext, vscode.ViewColumn.One);
    const html = (panel as any).getWebviewHtml(`
      <pre class="mermaid">
        graph INVALID SYNTAX HERE
      </pre>
    `, mockDocument);

    await page.setContent(html, { waitUntil: 'networkidle' });

    // Track console errors
    const syntaxErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('SyntaxError')) {
        syntaxErrors.push(msg.text());
      }
    });

    // Wait for Mermaid to attempt rendering
    await page.waitForTimeout(2000);

    // Should NOT have syntax errors (even though Mermaid will have a rendering error)
    expect(syntaxErrors).toHaveLength(0);

    // Should have error display
    const errorDisplay = await page.evaluate(() => {
      return document.querySelector('.diagram-error, .mermaid-error') !== null;
    });

    expect(errorDisplay).toBe(true);
  });
});
