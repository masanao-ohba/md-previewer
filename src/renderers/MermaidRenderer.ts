/**
 * Mermaid diagram renderer.
 *
 * This module handles the rendering of Mermaid diagrams by generating
 * HTML containers that will be processed by mermaid.js in the webview.
 * Error isolation ensures that syntax errors in one diagram don't break
 * the entire document.
 */
export class MermaidRenderer {
  private static diagramCounter = 0;

  /**
   * Render a Mermaid diagram block.
   *
   * This method wraps the Mermaid source code in a div with a unique ID
   * that will be processed by mermaid.js in the webview. Each diagram is
   * isolated with error handling to prevent one bad diagram from breaking others.
   *
   * @param content - Mermaid diagram source code
   * @returns HTML string with Mermaid container
   */
  public static render(content: string): string {
    if (!content || content.trim() === '') {
      return this.renderError('Empty diagram content');
    }

    // Generate unique ID for this diagram
    const diagramId = `mermaid-${this.diagramCounter++}`;

    // Escape HTML to prevent XSS
    const escapedContent = this.escapeHtml(content);

    // Return HTML container that will be processed by mermaid.js
    // The pre element is used as a data carrier, and mermaid.js will replace it
    // The diagram-clickable class enables modal zoom on click
    return `<div class="diagram-clickable mermaid-container" data-diagram-id="${diagramId}" data-diagram-type="mermaid">
  <pre class="mermaid" id="${diagramId}">${escapedContent}</pre>
</div>`;
  }

  /**
   * Render an error message for a failed diagram.
   *
   * This is used when diagram content is invalid or when processing fails.
   * The error is displayed in a user-friendly format that doesn't break the document.
   *
   * @param errorMessage - Error description
   * @param content - Optional diagram content to display
   * @returns HTML string with error message
   */
  public static renderError(errorMessage: string, content?: string): string {
    const escapedMessage = this.escapeHtml(errorMessage);
    const contentSection = content
      ? `<details>
      <summary>View diagram source</summary>
      <pre><code>${this.escapeHtml(content)}</code></pre>
    </details>`
      : '';

    return `<div class="diagram-error mermaid-error" style="border: 2px solid #f85149; border-radius: 6px; padding: 16px; margin: 16px 0; background-color: #fff8f6;">
  <div style="display: flex; align-items: center; margin-bottom: 8px;">
    <svg style="width: 20px; height: 20px; margin-right: 8px; fill: #f85149;" viewBox="0 0 16 16">
      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0zm7-3.25a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 1.5 0v-3.5zm0 6a1 1 0 1 0-2 0 1 1 0 0 0 2 0z"/>
    </svg>
    <strong style="color: #f85149;">Mermaid Diagram Error</strong>
  </div>
  <p style="margin: 8px 0; color: #57606a;">${escapedMessage}</p>
  ${contentSection}
</div>`;
  }

  /**
   * Escape HTML special characters to prevent XSS.
   *
   * @param text - Text to escape
   * @returns Escaped text
   */
  private static escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }
}
