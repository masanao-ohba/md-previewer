import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';
import { MermaidRenderer } from '../renderers/MermaidRenderer';
import { PlantUMLRenderer } from '../renderers/PlantUMLRenderer';

/**
 * Processes Markdown text and converts it to HTML.
 *
 * This class wraps the markdown-it library and provides a clean interface
 * for Markdown processing. It extends the default renderer to detect and
 * render diagram code blocks (Mermaid and PlantUML) with error isolation.
 */
export class MarkdownProcessor {
  private readonly md: MarkdownIt;
  private readonly defaultFenceRenderer: MarkdownIt.Renderer.RenderRule;

  constructor() {
    // Initialize markdown-it with sensible defaults
    this.md = new MarkdownIt({
      html: true, // Enable HTML tags in source
      linkify: true, // Auto-convert URL-like text to links
      typographer: true, // Enable smartquotes and other typographic replacements
      breaks: false, // Do not convert \n to <br>
      xhtmlOut: false, // Use '>' to close single tags (<br>)
    });

    // Enable GitHub-style task list checkboxes
    this.md.use(taskLists, {
      enabled: true, // Enable checkbox rendering
      label: true, // Wrap checkbox in label for better UX
      labelAfter: true, // Place label after checkbox
    });

    // Store the default fence renderer before overriding
    this.defaultFenceRenderer = this.md.renderer.rules.fence || this.md.renderer.renderToken.bind(this.md.renderer);

    // Add custom renderer for code blocks to detect mermaid/plantuml
    this.md.renderer.rules.fence = this.renderCodeBlock.bind(this);
  }

  /**
   * Process Markdown text and return HTML.
   *
   * This method converts Markdown to HTML with async diagram rendering support.
   * PlantUML local mode requires async processing.
   *
   * @param markdown - Source Markdown text
   * @returns Promise resolving to rendered HTML
   */
  public async process(markdown: string): Promise<string> {
    if (!markdown || markdown.trim() === '') {
      return '<p><em>Empty document</em></p>';
    }

    try {
      // Render markdown with diagram support
      const html = this.md.render(markdown);
      return html;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Markdown processing error:', errorMessage);
      return `<div style="color: red; padding: 20px; border: 1px solid red; border-radius: 4px;">
        <h3>Markdown Processing Error</h3>
        <p>${this.escapeHtml(errorMessage)}</p>
      </div>`;
    }
  }

  /**
   * Escape HTML special characters to prevent XSS.
   *
   * @param text - Text to escape
   * @returns Escaped text
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }

  /**
   * Detect if a code block contains a Mermaid diagram.
   *
   * @param info - Language info from code fence
   * @returns True if this is a Mermaid block
   */
  private isMermaidBlock(info: string): boolean {
    return info.trim().toLowerCase() === 'mermaid';
  }

  /**
   * Detect if a code block contains a PlantUML diagram.
   *
   * @param info - Language info from code fence
   * @returns True if this is a PlantUML block
   */
  private isPlantUMLBlock(info: string): boolean {
    return info.trim().toLowerCase() === 'plantuml';
  }

  /**
   * Custom renderer for code blocks with diagram detection.
   *
   * This method intercepts the rendering of fenced code blocks to detect
   * Mermaid and PlantUML diagrams. When detected, it delegates to the
   * appropriate renderer. Error isolation is handled by the renderers.
   *
   * @param tokens - Token array
   * @param idx - Current token index
   * @param options - Markdown-it options
   * @param env - Environment (unused)
   * @param self - Renderer instance
   * @returns Rendered HTML
   */
  private renderCodeBlock(
    tokens: MarkdownIt.Token[],
    idx: number,
    options: MarkdownIt.Options,
    env: unknown,
    self: MarkdownIt.Renderer
  ): string {
    const token = tokens[idx];
    const info = token.info.trim();
    const content = token.content;

    try {
      if (this.isMermaidBlock(info)) {
        return MermaidRenderer.render(content);
      } else if (this.isPlantUMLBlock(info)) {
        // PlantUML online mode is synchronous (uses URL-based rendering)
        return PlantUMLRenderer.renderOnline(content);
      } else {
        // Default code block rendering
        return this.defaultFenceRenderer(tokens, idx, options, env, self);
      }
    } catch (error) {
      // If rendering fails, show error but continue document rendering
      const errorMessage = error instanceof Error ? error.message : 'Unknown rendering error';
      console.error(`Error rendering ${info} diagram:`, errorMessage);

      // Return error message in a visible format
      return `<div class="diagram-error" style="border: 2px solid #f85149; border-radius: 6px; padding: 16px; margin: 16px 0; background-color: #fff8f6;">
  <strong style="color: #f85149;">Diagram Rendering Error (${this.escapeHtml(info)})</strong>
  <p style="margin: 8px 0; color: #57606a;">${this.escapeHtml(errorMessage)}</p>
</div>`;
    }
  }
}
