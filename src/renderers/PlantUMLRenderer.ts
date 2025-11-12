import { spawn } from 'child_process';
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
  private static readonly URL_LENGTH_THRESHOLD = 2000;
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
    const config = vscode.workspace.getConfiguration('markdownPreviewEnhanced');
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
   * @param content - PlantUML diagram source code
   * @returns HTML string with PlantUML image or error message
   */
  public static renderOnline(content: string): string {
    if (!content || content.trim() === '') {
      return this.renderError('Empty diagram content');
    }

    console.log('[PlantUML] Starting online rendering');

    try {
      // Detect diagram size
      const lineCount = this.detectDiagramSize(content);
      console.log('[PlantUML] Diagram size:', lineCount, 'lines');

      // Encode PlantUML source for the URL
      const encoded = this.encodePlantUML(content);

      // Add ~1 prefix for DEFLATE format
      // PlantUML server URL format:
      // - DEFLATE: https://www.plantuml.com/plantuml/svg/~1{encoded}
      // - HUFFMAN (deprecated): https://www.plantuml.com/plantuml/svg/{encoded}
      const diagramUrl = `${this.PLANTUML_SERVER}~1${encoded}`;

      // Check URL length - if too long, show helpful error
      if (diagramUrl.length > this.URL_LENGTH_THRESHOLD) {
        console.log('[PlantUML] URL too long (' + diagramUrl.length + ' chars), exceeds threshold');
        return this.renderUrlTooLongError(lineCount, diagramUrl.length, content);
      }

      const diagramId = `plantuml-${this.diagramCounter++}`;

      console.log('[PlantUML] Encoding mode: DEFLATE');
      console.log('[PlantUML] Generated URL length:', diagramUrl.length, 'chars');
      console.log('[PlantUML] URL format check:', diagramUrl.includes('~1') ? '✓ DEFLATE format' : '✗ Missing ~1 prefix');

      // Escape the source code for safe storage in data attribute
      const escapedContent = this.escapeHtml(content);
      const escapedForAttribute = escapedContent.replace(/"/g, '&quot;');

      // Copy button HTML (same structure as Mermaid)
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

      // Return HTML with img tag and error handling
      // The onerror attribute provides fallback if the server fails
      // The diagram-clickable class enables modal zoom on click
      // The diagram-wrapper wraps the diagram with copy button
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
      ${this.renderError('Failed to load diagram from PlantUML server', content)}
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
   * Render error message for diagrams that are too large for online rendering.
   *
   * Shows helpful guidance with the URL length, suggesting local mode installation.
   *
   * @param lineCount - Number of lines in the diagram
   * @param urlLength - Length of the generated URL
   * @param content - Diagram source code
   * @returns HTML string with error message
   */
  private static renderUrlTooLongError(lineCount: number, urlLength: number, content?: string): string {
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
    <strong style="color: #f85149;">PlantUML Diagram Too Large</strong>
  </div>
  <p style="margin: 8px 0; color: #57606a;">
    <strong>Diagram too large for online rendering</strong><br/>
    • Diagram size: ${lineCount} lines<br/>
    • Generated URL: ${urlLength} characters (exceeds ${this.URL_LENGTH_THRESHOLD} character limit)<br/><br/>
    <strong>Solution:</strong> Install Java for local rendering:<br/>
    1. Download Java: <a href="https://java.com/download" target="_blank" style="color: #0078d4;">https://java.com/download</a><br/>
    2. Download PlantUML JAR: <a href="https://plantuml.com/download" target="_blank" style="color: #0078d4;">https://plantuml.com/download</a><br/>
    3. Configure PlantUML JAR path in settings<br/><br/>
    Or reduce the diagram complexity to fit within the URL limit.
  </p>
  ${contentSection}
</div>`;
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
   * @param content - PlantUML diagram source code
   * @param jarPath - Path to PlantUML JAR file
   * @returns Promise resolving to HTML string with PlantUML SVG
   */
  private static async renderLocal(content: string, jarPath: string): Promise<string> {
    // Validate prerequisites
    const javaInstalled = await JavaDetector.isJavaInstalled();
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

    // Prepare PlantUML source with @startuml/@enduml wrappers
    let plantUMLSource = content.trim();
    if (!plantUMLSource.startsWith('@startuml')) {
      plantUMLSource = '@startuml\n' + plantUMLSource;
    }
    if (!plantUMLSource.endsWith('@enduml')) {
      plantUMLSource = plantUMLSource + '\n@enduml';
    }

    // Render diagram using Java process
    try {
      const svg = await this.executeLocalPlantUML(jarPath, plantUMLSource);
      const diagramId = `plantuml-${this.diagramCounter++}`;

      // Escape the source code for safe storage in data attribute
      const escapedContent = this.escapeHtml(content);
      const escapedForAttribute = escapedContent.replace(/"/g, '&quot;');

      // Copy button HTML (same structure as online mode)
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

      return `<div class="diagram-wrapper">
  ${copyButtonHtml}
  <div class="diagram-clickable plantuml-container" data-diagram-id="${diagramId}" data-diagram-type="plantuml">
    ${svg}
  </div>
</div>`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Local rendering failed';
      return this.renderError(errorMessage, content);
    }
  }

  /**
   * Execute PlantUML JAR to generate SVG output.
   *
   * Spawns a Java process with PlantUML JAR, pipes the diagram source to stdin,
   * and captures the SVG output from stdout.
   *
   * @param jarPath - Path to PlantUML JAR file
   * @param source - PlantUML source code (with @startuml/@enduml)
   * @returns Promise resolving to SVG string
   */
  private static executeLocalPlantUML(jarPath: string, source: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Spawn Java process with PlantUML
      // Arguments: -jar <jarPath> -pipe -tsvg
      // -pipe: Read from stdin, write to stdout
      // -tsvg: Output SVG format
      const javaProcess = spawn('java', ['-jar', jarPath, '-pipe', '-tsvg']);

      let svgOutput = '';
      let errorOutput = '';

      // Capture stdout (SVG output)
      javaProcess.stdout.on('data', (data) => {
        svgOutput += data.toString();
      });

      // Capture stderr (error messages)
      javaProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      // Handle process completion
      javaProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`PlantUML process exited with code ${code}: ${errorOutput}`));
        } else if (!svgOutput || svgOutput.trim() === '') {
          reject(new Error('PlantUML produced no output'));
        } else {
          resolve(svgOutput);
        }
      });

      // Handle process errors
      javaProcess.on('error', (error) => {
        reject(new Error(`Failed to spawn PlantUML process: ${error.message}`));
      });

      // Write PlantUML source to stdin
      try {
        javaProcess.stdin.write(source);
        javaProcess.stdin.end();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reject(new Error(`Failed to write to PlantUML stdin: ${errorMessage}`));
      }
    });
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
}
