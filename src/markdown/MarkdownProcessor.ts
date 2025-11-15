import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';
import { MermaidRenderer } from '../renderers/MermaidRenderer';
import { PlantUMLRenderer } from '../renderers/PlantUMLRenderer';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import xml from 'highlight.js/lib/languages/xml'; // HTML
import css from 'highlight.js/lib/languages/css';
import php from 'highlight.js/lib/languages/php';
import python from 'highlight.js/lib/languages/python';
import ruby from 'highlight.js/lib/languages/ruby';
import java from 'highlight.js/lib/languages/java';
import yaml from 'highlight.js/lib/languages/yaml';
import json from 'highlight.js/lib/languages/json';
import diff from 'highlight.js/lib/languages/diff';
import bash from 'highlight.js/lib/languages/bash';
import scss from 'highlight.js/lib/languages/scss';
import sql from 'highlight.js/lib/languages/sql';
import * as vscode from 'vscode';

/**
 * Supported languages for syntax highlighting.
 * Each language has a name, optional aliases, and highlight.js module.
 */
interface LanguageDefinition {
  name: string;
  aliases: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  module: any;
}

const SUPPORTED_LANGUAGES: LanguageDefinition[] = [
  { name: 'javascript', aliases: ['js'], module: javascript },
  { name: 'html', aliases: ['htm'], module: xml },
  { name: 'css', aliases: [], module: css },
  { name: 'php', aliases: [], module: php },
  { name: 'python', aliases: ['py'], module: python },
  { name: 'ruby', aliases: ['rb'], module: ruby },
  { name: 'java', aliases: [], module: java },
  { name: 'yaml', aliases: ['yml'], module: yaml },
  { name: 'json', aliases: [], module: json },
  { name: 'diff', aliases: ['patch'], module: diff },
  { name: 'bash', aliases: ['sh', 'shell'], module: bash },
  { name: 'scss', aliases: ['sass'], module: scss },
  { name: 'sql', aliases: [], module: sql },
  { name: 'jsonl', aliases: [], module: json }, // JSONL uses JSON syntax
];

// Register all languages with highlight.js
SUPPORTED_LANGUAGES.forEach((lang) => {
  hljs.registerLanguage(lang.name, lang.module);
});

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
      highlight: (str: string, lang: string): string => this.highlightCode(str, lang),
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
      let html = this.md.render(markdown);

      // Add copy buttons to code blocks
      html = this.addCopyButtons(html);

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
        // Read PlantUML configuration from settings
        const config = vscode.workspace.getConfiguration('markdownPreviewer');
        const mode = config.get<'online' | 'local'>('plantuml.mode', 'online');
        const jarPath = config.get<string>('plantuml.jarPath', '');

        // Call the appropriate renderer based on mode
        if (mode === 'local') {
          return PlantUMLRenderer.renderLocal(content, jarPath);
        } else {
          return PlantUMLRenderer.renderOnline(content);
        }
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

  /**
   * Wrap code blocks with copy button container.
   * This is called as a post-processing step after markdown-it renders the HTML.
   *
   * @param html - Rendered HTML from markdown-it
   * @returns HTML with copy buttons added
   */
  private addCopyButtons(html: string): string {
    // Regular expression to find <pre><code> blocks
    // This matches standard code blocks but NOT diagram containers
    const codeBlockRegex = /<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g;

    // Copy button HTML with SVG icon
    const copyButtonHtml = `
    <button class="copy-code-button" aria-label="Copy code to clipboard" title="Copy code">
      <svg class="copy-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.75 4.75H10.25V1.75H5.75V4.75ZM4.5 1.75C4.5 1.05964 5.05964 0.5 5.75 0.5H10.25C10.9404 0.5 11.5 1.05964 11.5 1.75V4.75H13.25C13.9404 4.75 14.5 5.30964 14.5 6V13.25C14.5 13.9404 13.9404 14.5 13.25 14.5H2.75C2.05964 14.5 1.5 13.9404 1.5 13.25V6C1.5 5.30964 2.05964 4.75 2.75 4.75H4.5V1.75ZM2.75 6V13.25H13.25V6H2.75Z" fill="currentColor"/>
      </svg>
      <span class="button-text">Copy</span>
      <span class="button-feedback" role="status" aria-live="polite"></span>
    </button>
  `.trim();

    // Replace each code block with wrapped version
    return html.replace(codeBlockRegex, (_match, attributes, code) => {
      return `<div class="code-block-wrapper">${copyButtonHtml}<pre><code${attributes}>${code}</code></pre></div>`;
    });
  }

  /**
   * Highlight code using highlight.js.
   *
   * This method is called by markdown-it for each fenced code block.
   * If the language is supported, returns highlighted HTML.
   * If not supported, returns empty string to trigger default escaping.
   *
   * @param code - Code content to highlight
   * @param lang - Language identifier from fence
   * @returns Highlighted HTML or empty string
   */
  private highlightCode(code: string, lang: string): string {
    if (!lang) {
      return ''; // No language specified, use default
    }

    // Normalize language (handle aliases)
    const normalizedLang = this.normalizeLanguage(lang);
    if (!normalizedLang) {
      console.warn(`Syntax highlighting not supported for language: ${lang}`);
      return ''; // Unsupported language, use default escaping
    }

    try {
      const result = hljs.highlight(code, { language: normalizedLang });
      return result.value;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error highlighting ${lang} code:`, errorMessage);
      return ''; // Fall back to default escaping on error
    }
  }

  /**
   * Normalize language identifier to handle aliases.
   *
   * @param lang - Language identifier from fence
   * @returns Normalized language name or null if unsupported
   */
  private normalizeLanguage(lang: string): string | null {
    const lowercased = lang.toLowerCase();

    // Check if it's a direct match
    const direct = SUPPORTED_LANGUAGES.find((l) => l.name === lowercased);
    if (direct) {
      return direct.name;
    }

    // Check aliases
    const aliased = SUPPORTED_LANGUAGES.find((l) => l.aliases.includes(lowercased));
    if (aliased) {
      return aliased.name;
    }

    return null; // Language not supported
  }
}
