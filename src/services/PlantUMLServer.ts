import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';

/**
 * PlantUML local server manager with persistent process.
 *
 * This service maintains a long-running PlantUML server process (-picoweb mode)
 * to avoid the 5-8 second Java startup overhead on every render.
 *
 * Performance improvement:
 * - Before: 10 seconds per render (Java startup + rendering)
 * - After: 0.2-0.5 seconds per render (HTTP request only)
 *
 * Architecture:
 * 1. Start server once when extension activates (if local mode enabled)
 * 2. Reuse the same process for all rendering requests
 * 3. Stop server when extension deactivates
 */
export class PlantUMLServer {
  private process: ChildProcess | null = null;
  private port: number = 0;
  private isReady: boolean = false;

  // Port range for auto-detection (typically available ports)
  private static readonly PORT_RANGE_START = 18000;
  private static readonly PORT_RANGE_END = 18100;

  /**
   * Start PlantUML server in -picoweb mode.
   *
   * This method spawns a Java process that runs PlantUML as an HTTP server.
   * The server listens on the specified port (or auto-detected port) and
   * accepts POST requests to /svg endpoint.
   *
   * @param jarPath - Path to PlantUML JAR file
   * @param preferredPort - Preferred port number (0 = auto-detect)
   * @returns Promise resolving to the actual port number used
   */
  async start(jarPath: string, preferredPort: number = 0): Promise<number> {
    console.log('[PlantUML Server] start() called, jarPath:', jarPath, 'preferredPort:', preferredPort);

    if (this.isReady) {
      console.log('[PlantUML Server] Already running on port', this.port);
      return this.port;
    }

    // Find available port
    console.log('[PlantUML Server] Finding available port...');
    this.port = preferredPort > 0
      ? await this.validatePort(preferredPort)
      : await this.findAvailablePort();

    console.log('[PlantUML Server] Port selected:', this.port);
    console.log('[PlantUML Server] Starting PlantUML server process...');

    // Spawn PlantUML server process
    this.process = spawn('java', [
      '-Djava.awt.headless=true',        // No GUI libraries
      '-Xmx512m',                         // Max heap 512MB
      '-XX:+TieredCompilation',           // Enable JIT compilation
      '-XX:TieredStopAtLevel=1',          // Fast startup (C1 compiler only)
      '-XX:+UseSerialGC',                 // Simple GC for low latency
      '-jar', jarPath,
      `-picoweb:${this.port}`             // HTTP server mode
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Handle process events
    this.process.on('error', (error) => {
      console.error('[PlantUML Server] Process error:', error);
      this.isReady = false;
    });

    this.process.on('exit', (code, signal) => {
      console.log('[PlantUML Server] Process exited:', { code, signal });
      this.isReady = false;
    });

    // Log stdout/stderr for debugging
    this.process.stdout?.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log('[PlantUML Server] stdout:', output);
      }
    });

    this.process.stderr?.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.error('[PlantUML Server] stderr:', output);
      }
    });

    // Wait for server to be ready
    await this.waitForReady();

    this.isReady = true;
    console.log('[PlantUML Server] Ready on port', this.port);

    return this.port;
  }

  /**
   * Render PlantUML diagram via HTTP request (asynchronous).
   *
   * Sends a POST request to the local PlantUML server with the diagram source.
   * This is significantly faster than spawning a new Java process each time.
   *
   * @param source - PlantUML diagram source code
   * @returns Promise resolving to SVG string
   */
  async render(source: string): Promise<string> {
    if (!this.isReady) {
      throw new Error('PlantUML server is not running. Call start() first.');
    }

    try {
      const response = await fetch(`http://localhost:${this.port}/svg`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain; charset=utf-8'
        },
        body: source
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}: ${response.statusText}`);
      }

      const svg = await response.text();

      if (!svg || svg.trim() === '') {
        throw new Error('Server returned empty response');
      }

      return svg;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`PlantUML server request failed: ${errorMessage}`);
    }
  }

  /**
   * Encode PlantUML source using PlantUML's encoding scheme.
   *
   * @param source - PlantUML source code
   * @returns Encoded string for URL
   */
  private encodePlantUML(source: string): string {
    const { deflateSync } = require('zlib');

    // PlantUML custom base64 alphabet
    const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';

    // Compress with DEFLATE
    const compressed = deflateSync(Buffer.from(source, 'utf-8'), { level: 9 });

    // Encode to PlantUML base64
    let result = '';
    for (let i = 0; i < compressed.length; i += 3) {
      const byte1 = compressed[i];
      const byte2 = i + 1 < compressed.length ? compressed[i + 1] : 0;
      const byte3 = i + 2 < compressed.length ? compressed[i + 2] : 0;

      const value = (byte1 << 16) | (byte2 << 8) | byte3;

      result += alphabet[(value >> 18) & 0x3f];
      result += alphabet[(value >> 12) & 0x3f];
      result += alphabet[(value >> 6) & 0x3f];
      result += alphabet[value & 0x3f];
    }

    return result;
  }

  /**
   * Render PlantUML diagram via HTTP request (synchronous wrapper).
   *
   * Uses GET request with encoded diagram (PlantUML -picoweb mode only supports GET).
   *
   * @param source - PlantUML diagram source code
   * @returns SVG string
   */
  renderSync(source: string): string {
    if (!this.isReady) {
      throw new Error('PlantUML server is not running. Call start() first.');
    }

    try {
      const { execSync } = require('child_process');

      // Encode diagram source
      const encoded = this.encodePlantUML(source);
      console.log(`[PlantUML Server] Encoded ${source.length} bytes to ${encoded.length} chars`);

      // PlantUML -picoweb uses /plantuml/svg/{encoded} endpoint
      const url = `http://localhost:${this.port}/plantuml/svg/~1${encoded}`;
      console.log(`[PlantUML Server] Sending GET request to ${url.substring(0, 100)}...`);

      let svg: string;

      if (process.platform === 'win32') {
        // Windows: Use PowerShell
        const psCommand = `(Invoke-WebRequest -Uri '${url}' -UseBasicParsing).Content`;
        svg = execSync(`powershell -Command "${psCommand}"`, {
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024
        });
      } else {
        // Unix/Linux/Mac: Use curl
        svg = execSync(`curl -s "${url}"`, {
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024
        });
      }

      console.log(`[PlantUML Server] Received response: ${svg.length} bytes`);

      if (!svg || svg.trim() === '') {
        throw new Error('Server returned empty response');
      }

      return svg;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`PlantUML server request failed: ${errorMessage}`);
    }
  }

  /**
   * Stop the PlantUML server.
   *
   * This should be called when the extension is deactivated to clean up resources.
   */
  stop(): void {
    if (this.process) {
      console.log('[PlantUML Server] Stopping server on port', this.port);
      this.process.kill('SIGTERM');
      this.process = null;
      this.isReady = false;
    }
  }

  /**
   * Check if server is ready and running.
   *
   * @returns True if server is ready to accept requests
   */
  isServerReady(): boolean {
    return this.isReady;
  }

  /**
   * Get the current port number.
   *
   * @returns Port number (0 if server is not running)
   */
  getPort(): number {
    return this.port;
  }

  /**
   * Wait for server to be ready by polling the health endpoint.
   *
   * PlantUML -picoweb server takes a few seconds to initialize.
   * This method polls the server until it responds successfully.
   */
  private async waitForReady(): Promise<void> {
    const maxAttempts = 30; // 30 seconds max
    const delayMs = 1000;   // 1 second between attempts

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Try to connect to the server
        const response = await fetch(`http://localhost:${this.port}/`, {
          method: 'GET'
        });

        // If we get any response, server is ready
        if (response.status >= 200 && response.status < 500) {
          console.log('[PlantUML Server] Ready after', attempt, 'attempts');
          return;
        }
      } catch (error) {
        // Server not ready yet, continue polling
      }

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    throw new Error('PlantUML server failed to start within 30 seconds');
  }

  /**
   * Find an available port in the default range.
   *
   * Iterates through the port range (18000-18100) and returns the first
   * available port. If all ports are occupied, throws an error.
   *
   * @returns Promise resolving to available port number
   */
  private async findAvailablePort(): Promise<number> {
    for (let port = PlantUMLServer.PORT_RANGE_START; port <= PlantUMLServer.PORT_RANGE_END; port++) {
      if (await this.isPortAvailable(port)) {
        return port;
      }
    }

    throw new Error(`No available ports in range ${PlantUMLServer.PORT_RANGE_START}-${PlantUMLServer.PORT_RANGE_END}`);
  }

  /**
   * Validate that a preferred port is available.
   *
   * If the preferred port is not available, falls back to auto-detection.
   *
   * @param port - Preferred port number
   * @returns Promise resolving to the port number to use
   */
  private async validatePort(port: number): Promise<number> {
    if (await this.isPortAvailable(port)) {
      return port;
    }

    console.warn(`[PlantUML Server] Port ${port} is not available, auto-detecting...`);
    return this.findAvailablePort();
  }

  /**
   * Check if a port is available for binding.
   *
   * Creates a temporary server to test if the port is free.
   *
   * @param port - Port number to check
   * @returns Promise resolving to true if port is available
   */
  private isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();

      server.once('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          resolve(false); // Port is in use
        } else {
          resolve(false); // Other error, assume unavailable
        }
      });

      server.once('listening', () => {
        server.close(() => {
          resolve(true); // Port is available
        });
      });

      server.listen(port, '127.0.0.1');
    });
  }
}
