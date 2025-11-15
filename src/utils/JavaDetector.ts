import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execAsync = promisify(exec);

/**
 * Java installation detector for PlantUML local mode.
 *
 * This class provides utilities to detect Java installation and validate
 * PlantUML JAR file existence. These checks are required for local PlantUML
 * rendering.
 */
export class JavaDetector {
  private static javaVersionCache: string | null = null;

  /**
   * Check if Java is installed on the system.
   *
   * Executes 'java -version' command to verify Java installation.
   * Caches the result to avoid repeated system calls.
   *
   * @returns Promise resolving to true if Java is installed, false otherwise
   */
  public static async isJavaInstalled(): Promise<boolean> {
    // Return cached result if available
    if (this.javaVersionCache !== null) {
      return true;
    }

    try {
      const { stdout, stderr } = await execAsync('java -version');
      const output = stdout || stderr; // Java version outputs to stderr

      // Cache the version string
      if (output) {
        this.javaVersionCache = output;
        return true;
      }

      return false;
    } catch (error) {
      console.log('Java not found on system:', error);
      return false;
    }
  }

  /**
   * Check if Java is installed on the system (synchronous version).
   *
   * Executes 'java -version' command synchronously to verify Java installation.
   * Caches the result to avoid repeated system calls.
   *
   * @returns true if Java is installed, false otherwise
   */
  public static isJavaInstalledSync(): boolean {
    // Return cached result if available
    if (this.javaVersionCache !== null) {
      return true;
    }

    try {
      const output = execSync('java -version', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
      // Java version outputs to stderr, so we need to check both stdout and stderr
      // execSync with stdio: ['pipe', 'pipe', 'pipe'] will capture both

      // Cache the version string
      if (output || output === '') {
        // Even if output is empty, the command succeeded (Java outputs to stderr)
        this.javaVersionCache = output || 'installed';
        return true;
      }

      return false;
    } catch (error) {
      console.log('Java not found on system:', error);
      return false;
    }
  }

  /**
   * Get Java version string.
   *
   * Returns the full Java version output from 'java -version' command.
   * Useful for debugging and displaying to users.
   *
   * @returns Promise resolving to Java version string or null if not found
   */
  public static async getJavaVersion(): Promise<string | null> {
    try {
      const { stdout, stderr } = await execAsync('java -version');
      const output = stdout || stderr;

      if (output) {
        this.javaVersionCache = output;
        return output.trim();
      }

      return null;
    } catch (error) {
      console.error('Error getting Java version:', error);
      return null;
    }
  }

  /**
   * Validate PlantUML JAR file path.
   *
   * Checks if the specified PlantUML JAR file exists and is readable.
   * This is required before attempting local PlantUML rendering.
   *
   * @param jarPath - Absolute path to PlantUML JAR file
   * @returns True if JAR file exists and is readable, false otherwise
   */
  public static validatePlantUMLJar(jarPath: string): boolean {
    try {
      // Check if file exists
      if (!fs.existsSync(jarPath)) {
        console.warn(`PlantUML JAR not found at: ${jarPath}`);
        return false;
      }

      // Check if it's a file (not a directory)
      const stats = fs.statSync(jarPath);
      if (!stats.isFile()) {
        console.warn(`PlantUML JAR path is not a file: ${jarPath}`);
        return false;
      }

      // Check if it has .jar extension
      if (!jarPath.toLowerCase().endsWith('.jar')) {
        console.warn(`PlantUML JAR path does not have .jar extension: ${jarPath}`);
        return false;
      }

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error validating PlantUML JAR at ${jarPath}:`, errorMessage);
      return false;
    }
  }

  /**
   * Get detailed system requirements status for PlantUML local mode.
   *
   * Checks both Java installation and PlantUML JAR validity.
   * Returns detailed status information useful for error messages.
   *
   * @param jarPath - Optional path to PlantUML JAR (if configured)
   * @returns Promise resolving to requirements status
   */
  public static async getSystemRequirementsStatus(
    jarPath?: string
  ): Promise<{
    javaInstalled: boolean;
    javaVersion: string | null;
    jarValid: boolean;
    jarPath: string | null;
    ready: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Check Java
    const javaInstalled = await this.isJavaInstalled();
    const javaVersion = javaInstalled ? await this.getJavaVersion() : null;

    if (!javaInstalled) {
      errors.push('Java is not installed or not in system PATH');
    }

    // Check PlantUML JAR
    let jarValid = false;
    if (jarPath) {
      jarValid = this.validatePlantUMLJar(jarPath);
      if (!jarValid) {
        errors.push(`PlantUML JAR file is invalid or not found: ${jarPath}`);
      }
    } else {
      errors.push('PlantUML JAR path is not configured');
    }

    return {
      javaInstalled,
      javaVersion,
      jarValid,
      jarPath: jarPath || null,
      ready: javaInstalled && jarValid,
      errors,
    };
  }

  /**
   * Clear cached Java version.
   *
   * Primarily used for testing to reset the detector state.
   */
  public static clearCache(): void {
    this.javaVersionCache = null;
  }

  /**
   * Get installation instructions for missing dependencies.
   *
   * Returns platform-specific instructions for installing Java and PlantUML.
   *
   * @returns Installation instructions as HTML string
   */
  public static getInstallationInstructions(): string {
    const platform = process.platform;

    let javaInstructions = '';
    if (platform === 'win32') {
      javaInstructions = `
        <h4>Install Java on Windows:</h4>
        <ol>
          <li>Download Java from <a href="https://adoptium.net/">Adoptium</a></li>
          <li>Run the installer and follow the installation wizard</li>
          <li>Restart VS Code after installation</li>
        </ol>
      `;
    } else if (platform === 'darwin') {
      javaInstructions = `
        <h4>Install Java on macOS:</h4>
        <pre><code>brew install openjdk</code></pre>
        <p>Or download from <a href="https://adoptium.net/">Adoptium</a></p>
      `;
    } else {
      javaInstructions = `
        <h4>Install Java on Linux:</h4>
        <pre><code>sudo apt install default-jdk</code></pre>
        <p>Or use your distribution's package manager</p>
      `;
    }

    return `
      <div style="padding: 16px; background-color: #f6f8fa; border-radius: 6px; margin: 16px 0;">
        <h3>PlantUML Local Mode Setup</h3>
        ${javaInstructions}
        <h4>Install PlantUML:</h4>
        <ol>
          <li>Download PlantUML JAR from <a href="https://plantuml.com/download">plantuml.com/download</a></li>
          <li>Save it to a permanent location (e.g., ~/plantuml.jar)</li>
          <li>Configure the path in VS Code settings:<br>
            <code>Markdown Preview Enhanced: PlantUML Jar Path</code>
          </li>
        </ol>
        <h4>Configure Extension:</h4>
        <ol>
          <li>Open VS Code Settings (Cmd/Ctrl + ,)</li>
          <li>Search for "Markdown Preview Enhanced"</li>
          <li>Set "PlantUML Mode" to "local"</li>
          <li>Set "PlantUML Jar Path" to your JAR file location</li>
        </ol>
      </div>
    `;
  }
}
