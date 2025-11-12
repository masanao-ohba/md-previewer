import * as vscode from 'vscode';
import * as path from 'path';
import { MarkdownProcessor } from '../markdown/MarkdownProcessor';
import { ThemeManager } from '../themes/ThemeManager';

/**
 * Manages the webview panel for Markdown preview.
 *
 * This class handles the lifecycle of the preview panel, including creation,
 * updates, and disposal. It also manages debounced updates to prevent
 * excessive rendering during rapid text changes.
 */
export class PreviewPanel {
  private readonly panel: vscode.WebviewPanel;
  private readonly processor: MarkdownProcessor;
  private readonly disposables: vscode.Disposable[] = [];
  private updateTimeout: NodeJS.Timeout | undefined;
  private readonly debounceDelay: number;
  private isDisposed: boolean = false;

  private context: vscode.ExtensionContext;

  private constructor(
    panel: vscode.WebviewPanel,
    context: vscode.ExtensionContext,
    document: vscode.TextDocument
  ) {
    this.panel = panel;
    this.processor = new MarkdownProcessor();
    this.context = context;

    // Get debounce delay from configuration
    const config = vscode.workspace.getConfiguration('markdownPreviewEnhanced');
    this.debounceDelay = config.get('preview.debounceDelay', 300);

    // Set initial content
    void this.updateContent(document);

    // Handle panel disposal
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // Handle messages from webview (zoom controls, theme changes)
    this.panel.webview.onDidReceiveMessage(
      (message) => {
        void this.handleWebviewMessage(message);
      },
      null,
      this.disposables
    );
  }

  /**
   * Create a new preview panel.
   *
   * @param context - Extension context
   * @param document - Markdown document to preview
   * @param column - View column for the panel
   * @returns New PreviewPanel instance
   */
  public static create(
    context: vscode.ExtensionContext,
    document: vscode.TextDocument,
    column: vscode.ViewColumn
  ): PreviewPanel {
    const panel = vscode.window.createWebviewPanel(
      'markdownPreview',
      `Preview: ${path.basename(document.fileName)}`,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.dirname(document.fileName)),
          vscode.Uri.joinPath(context.extensionUri, 'media'),
        ],
      }
    );

    return new PreviewPanel(panel, context, document);
  }

  /**
   * Reveal the panel in the specified column.
   *
   * @param column - View column to reveal the panel in
   */
  public reveal(column: vscode.ViewColumn): void {
    if (this.isDisposed) {
      throw new Error('Cannot reveal disposed PreviewPanel');
    }
    this.panel.reveal(column, true);
  }

  /**
   * Update the preview with new document content (debounced).
   *
   * @param document - Updated document
   */
  public update(document: vscode.TextDocument): void {
    if (this.isDisposed) {
      return; // Silently ignore updates to disposed panel
    }

    // Clear existing timeout
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    // Set new timeout for debounced update
    this.updateTimeout = setTimeout(() => {
      this.updateContent(document);
    }, this.debounceDelay);
  }

  /**
   * Immediately update the webview content.
   *
   * @param document - Document to render
   */
  private async updateContent(document: vscode.TextDocument): Promise<void> {
    try {
      const markdown = document.getText();
      const html = await this.processor.process(markdown);
      const fullHtml = this.getWebviewHtml(html, document);

      this.panel.webview.html = fullHtml;
      this.panel.title = `Preview: ${path.basename(document.fileName)}`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error updating preview:', errorMessage);
      vscode.window.showErrorMessage(`Failed to update preview: ${errorMessage}`);
    }
  }

  /**
   * Get webview URI for a media resource.
   *
   * @param relativePath - Path relative to media directory
   * @returns Webview URI for the resource
   */
  private getResourceUri(relativePath: string): vscode.Uri {
    return this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', relativePath)
    );
  }

  /**
   * Generate complete HTML for the webview.
   *
   * @param contentHtml - Rendered Markdown HTML
   * @param document - Source document
   * @returns Complete HTML document
   */
  private getWebviewHtml(contentHtml: string, document: vscode.TextDocument): string {
    void document;

    const config = vscode.workspace.getConfiguration('markdownPreviewEnhanced');
    const themeName = config.get('preview.theme', 'github-light');
    const themeContent = ThemeManager.getThemeContent(this.context, themeName);

    // Get URIs for external resources
    const modalZoomCssUri = this.getResourceUri('styles/modal-zoom.css');
    const mermaidInitUri = this.getResourceUri('scripts/mermaid-init.js');
    const plantumlInitUri = this.getResourceUri('scripts/plantuml-init.js');
    const errorRelocatorUri = this.getResourceUri('scripts/error-relocator.js');
    const modalZoomUri = this.getResourceUri('scripts/modal-zoom.js');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' https://cdn.jsdelivr.net ${this.panel.webview.cspSource}; script-src 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net ${this.panel.webview.cspSource}; img-src vscode-resource: https: data:;">
    <title>Markdown Preview</title>

    <!-- Mermaid library -->
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>

    <!-- Theme CSS -->
    <style>
        ${themeContent}
    </style>

    <!-- Modal Diagram Zoom CSS -->
    <link rel="stylesheet" href="${modalZoomCssUri}">
</head>
<body>
    <!-- Preview Container -->
    <div id="preview-container">
        ${contentHtml}
    </div>

    <!-- Modal Diagram Zoom -->
    <div id="diagram-modal">
        <div id="modal-content">
            <!-- Modal Header -->
            <div id="modal-header">
                <div id="modal-title">Diagram Preview</div>
                <button id="modal-close" title="Close (ESC)">&times;</button>
            </div>

            <!-- Modal Diagram Viewport -->
            <div id="modal-diagram-viewport">
                <div id="modal-diagram-wrapper">
                    <div id="modal-diagram-container">
                        <!-- Diagram will be cloned here -->
                    </div>
                </div>
            </div>

            <!-- Modal Zoom Controls -->
            <div id="modal-zoom-controls">
                <div style="flex: 1;"></div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button id="modal-zoom-out" title="Zoom Out (Ctrl/Cmd -)">−</button>
                    <span id="modal-zoom-level">100%</span>
                    <button id="modal-zoom-in" title="Zoom In (Ctrl/Cmd +)">+</button>
                </div>
                <div style="flex: 1; display: flex; justify-content: flex-end;">
                    <button id="modal-zoom-reset" title="Reset Zoom (Ctrl/Cmd 0)">Reset</button>
                </div>
            </div>
        </div>
    </div>

    <!-- External JavaScript Resources -->
    <script src="${mermaidInitUri}"></script>
    <script src="${plantumlInitUri}"></script>
    <script src="${errorRelocatorUri}"></script>
    <script src="${modalZoomUri}"></script>

    <!-- Code Copy Functionality -->
    <script>
    (function() {
      'use strict';

      /**
       * Code Copy Button Manager
       * Handles copying code to clipboard with visual feedback
       */
      const CodeCopyManager = {
        /**
         * Initialize copy button functionality
         */
        init: function() {
          // Use event delegation for better performance
          document.addEventListener('click', this.handleClick.bind(this));
          document.addEventListener('keydown', this.handleKeydown.bind(this));
        },

        /**
         * Handle click events on copy buttons
         */
        handleClick: function(event) {
          const button = event.target.closest('.copy-code-button');
          if (!button) return;

          event.preventDefault();
          this.copyCode(button);
        },

        /**
         * Handle keyboard events (Enter/Space on focused button)
         */
        handleKeydown: function(event) {
          if (event.key !== 'Enter' && event.key !== ' ') return;

          const button = event.target.closest('.copy-code-button');
          if (!button) return;

          event.preventDefault();
          this.copyCode(button);
        },

        /**
         * Copy code to clipboard
         */
        copyCode: async function(button) {
          // Check if Clipboard API is available
          if (!navigator.clipboard) {
            this.showError(button, 'Clipboard not available');
            return;
          }

          // Find the code element
          const wrapper = button.closest('.code-block-wrapper');
          if (!wrapper) return;

          const codeElement = wrapper.querySelector('pre code');
          if (!codeElement) return;

          // Extract code text
          const code = this.extractCode(codeElement);

          try {
            // Copy to clipboard
            await navigator.clipboard.writeText(code);
            this.showSuccess(button);
          } catch (error) {
            console.error('Failed to copy code:', error);
            this.showError(button, 'Failed to copy');
          }
        },

        /**
         * Extract plain text code from code element
         * Handles HTML entities and preserves whitespace
         */
        extractCode: function(codeElement) {
          // textContent automatically:
          // - Decodes HTML entities (&lt; -> <, &gt; -> >, &amp; -> &)
          // - Strips HTML tags (including syntax highlighting spans)
          // - Preserves whitespace and line breaks
          return codeElement.textContent || '';
        },

        /**
         * Show success feedback
         */
        showSuccess: function(button) {
          const feedback = button.querySelector('.button-feedback');
          if (!feedback) return;

          // Update feedback text
          feedback.textContent = 'Copied!';

          // Add copied class (triggers CSS to show feedback)
          button.classList.add('copied');

          // Reset after 2 seconds
          setTimeout(() => {
            button.classList.remove('copied');
            feedback.textContent = '';
          }, 2000);
        },

        /**
         * Show error feedback
         */
        showError: function(button, message) {
          const feedback = button.querySelector('.button-feedback');
          if (!feedback) return;

          feedback.textContent = message;
          button.classList.add('copied');

          setTimeout(() => {
            button.classList.remove('copied');
            feedback.textContent = '';
          }, 2000);
        }
      };

      // Initialize when DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => CodeCopyManager.init());
      } else {
        CodeCopyManager.init();
      }
    })();
    </script>
</body>
</html>`;
  }

  /**
   * Handle messages from the webview.
   *
   * @param message - Message from webview
   */
  private async handleWebviewMessage(message: {
    command: string;
    data?: unknown;
  }): Promise<void> {
    switch (message.command) {
      default:
        console.log('Received unknown message from webview:', message);
    }
  }

  /**
   * Check if the panel has been disposed.
   *
   * @returns True if panel is disposed, false otherwise
   */
  public isDisposedPanel(): boolean {
    return this.isDisposed;
  }

  /**
   * Register a callback for panel disposal.
   *
   * @param callback - Callback to invoke on disposal
   */
  public onDispose(callback: () => void): void {
    this.panel.onDidDispose(callback, null, this.disposables);
  }

  /**
   * Dispose of the panel and clean up resources.
   */
  public dispose(): void {
    this.isDisposed = true;

    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
