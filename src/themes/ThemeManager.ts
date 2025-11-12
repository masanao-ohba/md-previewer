import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Theme Manager for Markdown Preview.
 *
 * This class manages theme loading and application for the preview panel.
 * It reads theme CSS files from the resources directory and provides
 * methods to retrieve theme content.
 */
export class ThemeManager {
  private static readonly THEME_DIR = 'resources/themes';

  /**
   * Available theme names.
   *
   * These correspond to CSS files in the resources/themes directory.
   */
  public static readonly AVAILABLE_THEMES = [
    'github-light',
    'github-dark',
    'vscode-light',
    'vscode-dark',
    'high-contrast',
  ] as const;

  /**
   * Get theme CSS content.
   *
   * Reads the theme CSS file from the resources directory and returns
   * its content. If the theme file is not found, returns a fallback
   * minimal CSS.
   *
   * @param context - Extension context for resource path resolution
   * @param themeName - Name of the theme to load
   * @returns CSS content as string
   */
  public static getThemeContent(context: vscode.ExtensionContext, themeName: string): string {
    try {
      const themePath = path.join(context.extensionPath, this.THEME_DIR, `${themeName}.css`);

      if (!fs.existsSync(themePath)) {
        console.warn(`Theme file not found: ${themePath}`);
        return this.getFallbackTheme();
      }

      const themeContent = fs.readFileSync(themePath, 'utf8');
      return themeContent;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error loading theme ${themeName}:`, errorMessage);
      return this.getFallbackTheme();
    }
  }

  /**
   * Get webview URI for theme CSS file.
   *
   * This method provides a webview-compatible URI for loading theme CSS
   * directly in the webview HTML.
   *
   * @param context - Extension context
   * @param webview - Webview instance
   * @param themeName - Name of the theme
   * @returns Webview URI for the theme CSS
   */
  public static getThemeUri(
    context: vscode.ExtensionContext,
    webview: vscode.Webview,
    themeName: string
  ): vscode.Uri | null {
    try {
      const themePath = path.join(context.extensionPath, this.THEME_DIR, `${themeName}.css`);

      if (!fs.existsSync(themePath)) {
        return null;
      }

      const themeUri = webview.asWebviewUri(vscode.Uri.file(themePath));
      return themeUri;
    } catch (error) {
      console.error(`Error getting theme URI for ${themeName}:`, error);
      return null;
    }
  }

  /**
   * Validate theme name.
   *
   * Checks if the provided theme name is one of the available themes.
   *
   * @param themeName - Theme name to validate
   * @returns True if valid, false otherwise
   */
  public static isValidTheme(themeName: string): boolean {
    return this.AVAILABLE_THEMES.includes(themeName as (typeof this.AVAILABLE_THEMES)[number]);
  }

  /**
   * Get fallback theme CSS.
   *
   * Returns minimal CSS when theme loading fails. This ensures the preview
   * remains readable even if theme files are missing.
   *
   * @returns Minimal fallback CSS
   */
  private static getFallbackTheme(): string {
    return `
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        padding: 20px;
        max-width: 900px;
        margin: 0 auto;
        color: #333;
        background-color: #fff;
      }

      h1, h2, h3, h4, h5, h6 {
        margin-top: 24px;
        margin-bottom: 16px;
        font-weight: 600;
        line-height: 1.25;
      }

      code {
        padding: 0.2em 0.4em;
        margin: 0;
        font-size: 85%;
        background-color: rgba(27, 31, 35, 0.05);
        border-radius: 3px;
        font-family: monospace;
      }

      pre {
        padding: 16px;
        overflow: auto;
        background-color: #f6f8fa;
        border-radius: 6px;
      }

      pre code {
        background-color: transparent;
        padding: 0;
      }
    `;
  }

  /**
   * Get default theme based on VS Code's color theme.
   *
   * Automatically selects a theme that matches the user's VS Code theme.
   *
   * @returns Default theme name
   */
  public static getDefaultTheme(): string {
    const colorTheme = vscode.window.activeColorTheme;

    // Map VS Code theme kinds to preview themes
    switch (colorTheme.kind) {
      case vscode.ColorThemeKind.Light:
        return 'github-light';
      case vscode.ColorThemeKind.Dark:
        return 'github-dark';
      case vscode.ColorThemeKind.HighContrast:
      case vscode.ColorThemeKind.HighContrastLight:
        return 'high-contrast';
      default:
        return 'github-light';
    }
  }
}
