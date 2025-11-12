import { ThemeManager } from '../ThemeManager';
import * as path from 'path';

/**
 * Test suite for ThemeManager.
 *
 * This test verifies that the ThemeManager can load theme CSS files and
 * provides fallback when themes are missing. It also tests theme validation.
 */
describe('ThemeManager', () => {
  // Mock extension context
  const mockContext = {
    extensionPath: path.join(__dirname, '../../..'),
  } as any;

  describe('isValidTheme', () => {
    /**
     * If this test didn't exist, we wouldn't guarantee that all available
     * themes are correctly identified as valid.
     */
    it('should return true for all available themes', () => {
      ThemeManager.AVAILABLE_THEMES.forEach((theme) => {
        expect(ThemeManager.isValidTheme(theme)).toBe(true);
      });
    });

    /**
     * If this test didn't exist, we wouldn't guarantee that invalid theme
     * names are rejected.
     */
    it('should return false for invalid themes', () => {
      expect(ThemeManager.isValidTheme('invalid-theme')).toBe(false);
      expect(ThemeManager.isValidTheme('')).toBe(false);
      expect(ThemeManager.isValidTheme('random')).toBe(false);
    });
  });

  describe('getThemeContent', () => {
    /**
     * If this test didn't exist, we wouldn't guarantee that theme CSS
     * content is loaded for valid themes.
     */
    it('should load theme CSS content for valid themes', () => {
      const content = ThemeManager.getThemeContent(mockContext, 'github-light');
      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(0);
      expect(content).toContain('body');
    });

    /**
     * If this test didn't exist, we wouldn't guarantee that fallback CSS
     * is provided when theme file is missing.
     */
    it('should return fallback CSS for invalid theme', () => {
      const content = ThemeManager.getThemeContent(mockContext, 'non-existent-theme');
      expect(content).toBeTruthy();
      expect(content).toContain('body');
      expect(content).toContain('font-family');
    });
  });

  describe('getDefaultTheme', () => {
    /**
     * If this test didn't exist, we wouldn't guarantee that a default
     * theme is always returned.
     */
    it('should return a valid theme name', () => {
      const defaultTheme = ThemeManager.getDefaultTheme();
      expect(defaultTheme).toBeTruthy();
      expect(ThemeManager.isValidTheme(defaultTheme)).toBe(true);
    });
  });

  describe('AVAILABLE_THEMES', () => {
    /**
     * If this test didn't exist, we wouldn't guarantee that all required
     * themes are available.
     */
    it('should include at least 5 themes', () => {
      expect(ThemeManager.AVAILABLE_THEMES.length).toBeGreaterThanOrEqual(5);
    });

    /**
     * If this test didn't exist, we wouldn't guarantee that all required
     * theme names are present.
     */
    it('should include GitHub and VS Code themes', () => {
      const themes = ThemeManager.AVAILABLE_THEMES;
      expect(themes).toContain('github-light');
      expect(themes).toContain('github-dark');
      expect(themes).toContain('vscode-light');
      expect(themes).toContain('vscode-dark');
      expect(themes).toContain('high-contrast');
    });
  });
});
