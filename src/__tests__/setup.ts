/**
 * Jest setup file for mocking VSCode API.
 *
 * This file mocks the VSCode module globally so that tests can run
 * without requiring the actual VSCode runtime environment.
 */

// Mock the entire VSCode module
jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'plantuml.mode') {
          return 'online';
        }
        if (key === 'plantuml.jarPath') {
          return '';
        }
        if (key === 'preview.theme') {
          return 'github-light';
        }
        return defaultValue;
      }),
    })),
  },
  window: {
    activeColorTheme: {
      kind: 1, // ColorThemeKind.Light
    },
  },
  ColorThemeKind: {
    Light: 1,
    Dark: 2,
    HighContrast: 3,
    HighContrastLight: 4,
  },
  Uri: {
    file: jest.fn((path: string) => ({ fsPath: path })),
  },
}), { virtual: true });
