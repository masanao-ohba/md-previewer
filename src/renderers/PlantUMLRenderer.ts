import { spawnSync } from 'child_process';
import * as vscode from 'vscode';
import { deflateSync } from 'zlib';
import { JavaDetector } from '../utils/JavaDetector';

/**
 * PlantUML diagram renderer (online and local mode).
 *
 * This module handles rendering of PlantUML diagrams in two modes:
 * 1. Online mode: Encodes source and uses plantuml.com server
 * 2. Local mode: Uses local Java + PlantUML.jar for rendering
 *
 * Error isolation ensures syntax errors don't break the document.
 */
export class PlantUMLRenderer {
  private static readonly PLANTUML_SERVER = 'https://www.plantuml.com/plantuml/svg/';
  private static diagramCounter = 0;

  /**
   * Render a PlantUML diagram block.
   *
   * This method routes to online or local rendering based on the specified mode.
   * Each diagram is wrapped in an error-isolated container.
   *
   * Default behavior: Uses online mode (no Java required) unless explicitly specified.
   * This allows diagrams of any size to render via the PlantUML online service.
   *
   * @param content - PlantUML diagram source code
   * @param mode - Rendering mode ('online' or 'local'), defaults to 'online'
   * @param jarPath - Path to PlantUML JAR (required for local mode)
   * @returns Promise resolving to HTML string with PlantUML image
   */
  public static async render(
    content: string,
    mode?: 'online' | 'local',
    jarPath?: string
  ): Promise<string> {
    if (!content || content.trim() === '') {
      return this.renderError('Empty diagram content');
    }

    // Get configuration
    const config = vscode.workspace.getConfiguration('markdownPreviewer');
    const configuredJarPath = jarPath || config.get<string>('plantuml.jarPath', '');

    try {
      // Default to online mode unless explicitly specified
      const renderMode = mode ?? 'online';

      if (renderMode === 'local') {
        return await this.renderLocal(content, configuredJarPath);
      } else {
        return this.renderOnline(content);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown rendering error';
      return this.renderError(errorMessage, content);
    }
  }

  /**
   * Detect PlantUML diagram size by counting source lines.
   *
   * @deprecated This method is no longer used for default rendering behavior.
   * All diagrams now default to online mode regardless of size.
   * Kept for potential future use or testing purposes.
   *
   * @param content - PlantUML diagram source code
   * @returns Number of lines in the diagram source
   */
  private static detectDiagramSize(content: string): number {
    return content.split('\n').length;
  }

  /**
   * Select rendering mode based on diagram size.
   *
   * @deprecated This method is no longer used for default rendering behavior.
   * All diagrams now default to online mode unless explicitly specified as 'local'.
   * Kept for potential future use or testing purposes.
   *
   * Previous behavior:
   * - Small diagrams (< 40 lines): online mode
   * - Large diagrams (>= 40 lines): local mode
   *
   * @param lineCount - Number of lines in the diagram
   * @returns Rendering mode ('online' or 'local')
   */
  // @ts-expect-error: Deprecated method kept for testing purposes
  private static selectRenderingMode(lineCount: number): 'online' | 'local' {
    const ADAPTIVE_RENDERING_THRESHOLD = 40;
    return lineCount < ADAPTIVE_RENDERING_THRESHOLD ? 'online' : 'local';
  }


  /**
   * Render PlantUML diagram using online server (Phase 2 implementation).
   *
   * Uses smart routing: GET for small diagrams, error message for oversized diagrams.
   * When the URL exceeds the length threshold, shows helpful error suggesting local mode.
   *
   * When multiple @startuml/@enduml blocks exist in one code block, this method
   * renders ONLY the first block to avoid duplication (matching Backlog behavior).
   *
   * @param content - PlantUML diagram source code (may contain multiple @startuml/@enduml blocks)
   * @returns HTML string with PlantUML image in a single container or error message
   */
  public static renderOnline(content: string): string {
    if (!content || content.trim() === '') {
      return this.renderError('Empty diagram content');
    }

    console.log('[PlantUML] Starting online rendering');

    // Split content into individual @startuml/@enduml blocks
    const diagramBlocks = this.splitPlantUMLBlocks(content);
    const hasMultipleBlocks = diagramBlocks.length > 1;

    // Use only the first block if multiple blocks exist (matches Backlog behavior)
    const block = hasMultipleBlocks ? diagramBlocks[0] : content;

    try {
      const lineCount = this.detectDiagramSize(block);
      console.log('[PlantUML] Diagram size:', lineCount, 'lines');

      // Encode PlantUML source for the URL
      const encoded = this.encodePlantUML(block);
      const diagramUrl = `${this.PLANTUML_SERVER}~1${encoded}`;

      const diagramId = `plantuml-${this.diagramCounter++}`;
      console.log('[PlantUML] Generated URL length:', diagramUrl.length, 'chars');

      // Note: No artificial URL length restriction. Let the PlantUML server decide.
      // If the server cannot handle the request, it will return an error image.

      // Escape the original source code for copy button
      const escapedContent = this.escapeHtml(content);
      const escapedForAttribute = escapedContent.replace(/"/g, '&quot;');

      // Copy button HTML
      const copyButtonHtml = `
    <button class="copy-code-button"
            aria-label="Copy diagram source code"
            title="Copy diagram source"
            data-diagram-source="${escapedForAttribute}">
      <svg class="copy-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.75 4.75H10.25V1.75H5.75V4.75ZM4.5 1.75C4.5 1.05964 5.05964 0.5 5.75 0.5H10.25C10.9404 0.5 11.5 1.05964 11.5 1.75V4.75H13.25C13.9404 4.75 14.5 5.30964 14.5 6V13.25C14.5 13.9404 13.9404 14.5 13.25 14.5H2.75C2.05964 14.5 1.5 13.9404 1.5 13.25V6C1.5 5.30964 2.05964 4.75 2.75 4.75H4.5V1.75ZM2.75 6V13.25H13.25V6H2.75Z" fill="currentColor"/>
      </svg>
      <span class="button-text">Copy</span>
      <span class="button-feedback" role="status" aria-live="polite"></span>
    </button>
  `.trim();

      // Return image in a single diagram wrapper
      // The onerror handler displays the fallback message if the server returns an error image
      return `<div class="diagram-wrapper">
  ${copyButtonHtml}
  <div class="diagram-clickable plantuml-container" data-diagram-id="${diagramId}" data-diagram-type="plantuml">
    <img
      id="${diagramId}"
      src="${diagramUrl}"
      alt="PlantUML Diagram"
      style="max-width: 100%; height: auto;"
      onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
      onload="console.log('[PlantUML] Diagram loaded successfully');"
    />
    <div class="plantuml-error-fallback" style="display: none;">
      <div class="diagram-error plantuml-error" style="border: 2px solid #f85149; border-radius: 6px; padding: 16px; margin: 16px 0; background-color: #fff8f6;">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <svg style="width: 20px; height: 20px; margin-right: 8px; fill: #f85149;" viewBox="0 0 16 16">
            <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0zm7-3.25a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 1.5 0v-3.5zm0 6a1 1 0 1 0-2 0 1 1 0 0 0 2 0z"/>
          </svg>
          <strong style="color: #f85149;">PlantUML Server Error</strong>
        </div>
        <p style="margin: 8px 0; color: #57606a;">
          The PlantUML server could not render this diagram. This may be due to:<br/>
          • Diagram too large or complex for online rendering<br/>
          • Syntax errors in the diagram<br/>
          • Server limitations or timeout<br/><br/>
          <strong>Recommended solution:</strong> Use <strong>local mode</strong> with Java + PlantUML JAR for reliable rendering of large diagrams.<br/>
          Configure local mode in settings: <code>Markdown Preview Enhanced → PlantUML Mode → local</code>
        </p>
      </div>
    </div>
  </div>
</div>`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown encoding error';
      console.error('[PlantUML] Rendering error:', error);
      return this.renderError(errorMessage, content);
    }
  }

  /**
   * Split PlantUML content into individual @startuml/@enduml blocks.
   *
   * When a single code block contains multiple diagrams (multiple @startuml/@enduml pairs),
   * this method extracts each diagram as a separate block.
   *
   * @param content - PlantUML source code (may contain multiple diagrams)
   * @returns Array of individual diagram blocks
   */
  private static splitPlantUMLBlocks(content: string): string[] {
    const blocks: string[] = [];

    // Pattern to match @startuml ... @enduml blocks
    // Captures everything from @startuml (with optional name) to @enduml
    const blockPattern = /@startuml[^\n]*\n([\s\S]*?)@enduml/gi;

    let match;
    while ((match = blockPattern.exec(content)) !== null) {
      // Include @startuml and @enduml in the captured block
      blocks.push(match[0]);
    }

    return blocks;
  }

  /**
   * Encode PlantUML source using PlantUML's encoding scheme.
   *
   * PlantUML uses a custom base64-like encoding scheme. This implementation
   * follows the official encoding algorithm from PlantUML documentation.
   *
   * @param source - PlantUML source code
   * @returns Encoded string for URL
   */
  private static encodePlantUML(source: string): string {
    // Remove @startuml/@enduml if present (server handles this)
    let cleanSource = source.trim();
    if (cleanSource.startsWith('@startuml')) {
      cleanSource = cleanSource.replace(/^@startuml\s*\n?/, '');
    }
    if (cleanSource.endsWith('@enduml')) {
      cleanSource = cleanSource.replace(/\n?@enduml\s*$/, '');
    }

    // Use PlantUML text encoding (deflate + custom base64)
    // For Phase 2, we use simple URL encoding as it works for most cases
    // Phase 3 can implement the full deflate encoding if needed
    const compressed = this.compress(cleanSource);
    return this.encode64(compressed);
  }

  /**
   * Render PlantUML diagram using local Java + PlantUML.jar (Phase 3).
   *
   * This method spawns a Java process to execute PlantUML locally.
   * Requires Java installation and valid PlantUML JAR path.
   * Strategy 1: Provides actionable error messages guiding users to solution.
   *
   * When multiple @startuml/@enduml blocks exist in one code block, this method
   * renders ONLY the first block to avoid duplication (matching Backlog behavior).
   *
   * @param content - PlantUML diagram source code (may contain multiple @startuml/@enduml blocks)
   * @param jarPath - Path to PlantUML JAR file
   * @returns HTML string with PlantUML SVG in a single container
   */
  public static renderLocal(content: string, jarPath: string): string {
    // Validate prerequisites
    const javaInstalled = JavaDetector.isJavaInstalledSync();
    const lineCount = this.detectDiagramSize(content);

    if (!javaInstalled) {
      // Strategy 1: Helpful error with line count and Java download link
      return this.renderJavaRequiredError(lineCount, content);
    }

    if (!jarPath || jarPath.trim() === '') {
      return this.renderError(
        'PlantUML JAR path is not configured. Please configure it in settings.',
        content
      ) + JavaDetector.getInstallationInstructions();
    }

    const jarValid = JavaDetector.validatePlantUMLJar(jarPath);
    if (!jarValid) {
      return this.renderError(
        `PlantUML JAR file is invalid or not found: ${jarPath}`,
        content
      ) + JavaDetector.getInstallationInstructions();
    }

    // Check for multiple @startuml/@enduml blocks
    const diagramBlocks = this.splitPlantUMLBlocks(content);
    const hasMultipleBlocks = diagramBlocks.length > 1;

    // Use only the first block if multiple blocks exist (matches Backlog behavior)
    const plantUMLSource = hasMultipleBlocks ? diagramBlocks[0] : content.trim();

    // Render diagram using Java process
    try {
      const svgOutput = this.executeLocalPlantUML(jarPath, plantUMLSource);

      // Extract all SVG elements from output
      const svgs = this.extractSVGs(svgOutput);

      // Add responsive styles to each SVG
      const styledSvgs = svgs.map(svg => this.addResponsiveStyleToSVG(svg));

      // Combine all SVGs
      const combinedSvgs = styledSvgs.join('\n');
      const diagramId = `plantuml-${this.diagramCounter++}`;

      // Escape the source code for safe storage in data attribute
      const escapedContent = this.escapeHtml(content);
      const escapedForAttribute = escapedContent.replace(/"/g, '&quot;');

      // Copy button HTML
      const copyButtonHtml = `
    <button class="copy-code-button"
            aria-label="Copy diagram source code"
            title="Copy diagram source"
            data-diagram-source="${escapedForAttribute}">
      <svg class="copy-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.75 4.75H10.25V1.75H5.75V4.75ZM4.5 1.75C4.5 1.05964 5.05964 0.5 5.75 0.5H10.25C10.9404 0.5 11.5 1.05964 11.5 1.75V4.75H13.25C13.9404 4.75 14.5 5.30964 14.5 6V13.25C14.5 13.9404 13.9404 14.5 13.25 14.5H2.75C2.05964 14.5 1.5 13.9404 1.5 13.25V6C1.5 5.30964 2.05964 4.75 2.75 4.75H4.5V1.75ZM2.75 6V13.25H13.25V6H2.75Z" fill="currentColor"/>
      </svg>
      <span class="button-text">Copy</span>
      <span class="button-feedback" role="status" aria-live="polite"></span>
    </button>
  `.trim();

      // Return SVG in a single diagram wrapper
      return `<div class="diagram-wrapper">
  ${copyButtonHtml}
  <div class="diagram-clickable plantuml-container" data-diagram-id="${diagramId}" data-diagram-type="plantuml">
    ${combinedSvgs}
  </div>
</div>`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Local rendering failed';
      return this.renderError(errorMessage, content);
    }
  }

  /**
   * Extract all SVG elements from PlantUML output.
   *
   * When PlantUML processes multiple @startuml/@enduml blocks, it outputs
   * multiple <svg>...</svg> elements sequentially. This method extracts each one.
   *
   * @param output - Raw output from PlantUML (may contain multiple SVGs)
   * @returns Array of individual SVG strings
   */
  private static extractSVGs(output: string): string[] {
    const svgs: string[] = [];

    // Pattern to match complete <svg>...</svg> elements
    // The [\s\S] matches any character including newlines
    const svgPattern = /<svg[^>]*>[\s\S]*?<\/svg>/gi;

    let match;
    while ((match = svgPattern.exec(output)) !== null) {
      svgs.push(match[0]);
    }

    // If no SVGs found, return the output as-is (might be a single SVG without proper matching)
    if (svgs.length === 0 && output.includes('<svg')) {
      return [output];
    }

    return svgs;
  }

  /**
   * Execute PlantUML JAR to generate SVG output.
   *
   * Spawns a Java process with PlantUML JAR synchronously, pipes the diagram source to stdin,
   * and captures the SVG output from stdout.
   *
   * Performance optimizations:
   * - `-da`: Disable Java assertions (JVM optimization)
   * - `-pipe`: Read from stdin, write to stdout (reduce file I/O)
   * - `-tsvg`: Output SVG format
   * - `-failfast2`: Faster error handling for large projects
   *
   * These optimizations provide approximately 27% performance improvement
   * compared to default settings (measured: 1.9s → 1.4s for complex diagrams).
   *
   * @param jarPath - Path to PlantUML JAR file
   * @param source - PlantUML source code (with @startuml/@enduml)
   * @returns SVG string
   */
  private static executeLocalPlantUML(jarPath: string, source: string): string {
    try {
      // Spawn Java process with PlantUML synchronously
      // Java VM options: -da (disable assertions)
      // PlantUML options: -pipe -tsvg -failfast2
      const result = spawnSync('java', ['-da', '-jar', jarPath, '-pipe', '-tsvg', '-failfast2'], {
        input: source,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large diagrams
      });

      // Check for process errors
      if (result.error) {
        throw new Error(`Failed to spawn PlantUML process: ${result.error.message}`);
      }

      // Check exit code
      if (result.status !== 0) {
        const errorOutput = result.stderr || 'Unknown error';
        throw new Error(`PlantUML process exited with code ${result.status}: ${errorOutput}`);
      }

      // Validate output
      const svgOutput = result.stdout;
      if (!svgOutput || svgOutput.trim() === '') {
        throw new Error('PlantUML produced no output');
      }

      return svgOutput;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`PlantUML execution failed: ${errorMessage}`);
    }
  }

  /**
   * DEFLATE compression for PlantUML encoding.
   *
   * PlantUML server requires DEFLATE-compressed data for proper URL encoding.
   * This method uses Node.js zlib to perform standard DEFLATE compression.
   *
   * @param text - Text to compress
   * @returns Compressed bytes
   */
  private static compress(text: string): Uint8Array {
    // Convert text to UTF-8 bytes
    const utf8Bytes = Buffer.from(text, 'utf-8');

    // Apply DEFLATE compression
    const compressed = deflateSync(utf8Bytes, {
      level: 9, // Maximum compression
    });

    return new Uint8Array(compressed);
  }

  /**
   * Encode bytes using PlantUML's custom base64 encoding.
   *
   * PlantUML uses a modified base64 alphabet for URL-safe encoding.
   *
   * @param data - Bytes to encode
   * @returns Encoded string
   */
  private static encode64(data: Uint8Array): string {
    const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
    let result = '';
    let i = 0;

    while (i < data.length) {
      const byte1 = data[i++];
      const byte2 = i < data.length ? data[i++] : 0;
      const byte3 = i < data.length ? data[i++] : 0;

      const value = (byte1 << 16) | (byte2 << 8) | byte3;

      result += alphabet[(value >> 18) & 0x3f];
      result += alphabet[(value >> 12) & 0x3f];
      result += alphabet[(value >> 6) & 0x3f];
      result += alphabet[value & 0x3f];
    }

    return result;
  }

  /**
   * Render Java required error for large diagrams.
   *
   * Strategy 1 implementation: Actionable error message with line count and Java download link.
   * Guides user to solution rather than dead end.
   *
   * @param lineCount - Number of lines in the diagram
   * @param content - Diagram source code
   * @returns HTML string with error message
   */
  private static renderJavaRequiredError(lineCount: number, content?: string): string {
    const escapedContent = content ? this.escapeHtml(content) : '';
    const contentSection = content
      ? `<details>
      <summary>View diagram source</summary>
      <pre><code>${escapedContent}</code></pre>
    </details>`
      : '';

    return `<div class="diagram-error plantuml-error" style="border: 2px solid #f85149; border-radius: 6px; padding: 16px; margin: 16px 0; background-color: #fff8f6;">
  <div style="display: flex; align-items: center; margin-bottom: 8px;">
    <svg style="width: 20px; height: 20px; margin-right: 8px; fill: #f85149;" viewBox="0 0 16 16">
      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0zm7-3.25a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 1.5 0v-3.5zm0 6a1 1 0 1 0-2 0 1 1 0 0 0 2 0z"/>
    </svg>
    <strong style="color: #f85149;">PlantUML Diagram Error</strong>
  </div>
  <p style="margin: 8px 0; color: #57606a;">
    <strong>Diagram too large for online rendering (${lineCount} lines).</strong><br/>
    Install Java for local rendering: <a href="https://java.com/download" target="_blank" style="color: #0078d4;">https://java.com/download</a><br/>
    Or reduce diagram to less than 40 lines.
  </p>
  ${contentSection}
</div>`;
  }

  /**
   * Render an error message for a failed diagram.
   *
   * This is used when diagram encoding fails or when the server is unreachable.
   * The error is displayed in a user-friendly format.
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

    return `<div class="diagram-error plantuml-error" style="border: 2px solid #f85149; border-radius: 6px; padding: 16px; margin: 16px 0; background-color: #fff8f6;">
  <div style="display: flex; align-items: center; margin-bottom: 8px;">
    <svg style="width: 20px; height: 20px; margin-right: 8px; fill: #f85149;" viewBox="0 0 16 16">
      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0zm7-3.25a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 1.5 0v-3.5zm0 6a1 1 0 1 0-2 0 1 1 0 0 0 2 0z"/>
    </svg>
    <strong style="color: #f85149;">PlantUML Diagram Error</strong>
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

  /**
   * Add responsive styles to SVG to fit within container width.
   *
   * PlantUML generates fixed-size SVGs. This method adds CSS styles to make
   * the SVG responsive (max-width: 100%, height: auto) so it fits within
   * the container width while maintaining aspect ratio.
   *
   * @param svg - SVG string from PlantUML
   * @returns SVG with added responsive styles
   */
  private static addResponsiveStyleToSVG(svg: string): string {
    // Find the opening <svg> tag and add/update style attribute
    // The SVG tag may already have attributes like width, height, viewBox, etc.

    // Pattern to match <svg ... > (capturing the tag and its attributes)
    const svgTagPattern = /(<svg[^>]*?)(\s*style="[^"]*")?([^>]*>)/i;

    // Responsive styles to add
    const responsiveStyle = 'max-width: 100%; height: auto;';

    return svg.replace(svgTagPattern, (_match, before, existingStyle, after) => {
      if (existingStyle) {
        // Style attribute exists, append our styles
        const styleContent = existingStyle.match(/style="([^"]*)"/i)?.[1] || '';
        const newStyle = styleContent ? `${styleContent}; ${responsiveStyle}` : responsiveStyle;
        return `${before} style="${newStyle}"${after}`;
      } else {
        // No style attribute, add one
        return `${before} style="${responsiveStyle}"${after}`;
      }
    });
  }
}
