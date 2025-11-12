/**
 * Jest setup file for mocking VSCode API.
 *
 * This file mocks the VSCode module globally so that tests can run
 * without requiring the actual VSCode runtime environment.
 */

const defaultConfiguration = {
  'plantuml.mode': 'online',
  'plantuml.jarPath': '',
  'plantuml.requestType': 'get',
  'plantuml.server': 'https://www.plantuml.com/plantuml/svg/',
  'preview.theme': 'github-light',
} as const;

type ConfigurationValue = unknown;
type ConfigurationStore = Record<string, ConfigurationValue>;

const configurationStore: ConfigurationStore = { ...defaultConfiguration };

interface TestConfiguration {
  get: jest.Mock<ConfigurationValue, [string, ConfigurationValue?]>;
  __set: (key: string, value: ConfigurationValue) => void;
  __reset: () => void;
}

const configuration: TestConfiguration = {
  get: jest.fn((key: string, defaultValue?: ConfigurationValue) => {
    if (Object.prototype.hasOwnProperty.call(configurationStore, key)) {
      return configurationStore[key];
    }
    return defaultValue as ConfigurationValue;
  }),
  __set(key: string, value: ConfigurationValue) {
    configurationStore[key] = value;
  },
  __reset() {
    Object.assign(configurationStore, defaultConfiguration);
  },
};

beforeEach(() => {
  configuration.__reset();
});

// Mock the entire VSCode module
jest.mock(
  'vscode',
  () => ({
    workspace: {
      getConfiguration: jest.fn(() => configuration),
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
  }),
  { virtual: true }
);

export const testConfiguration = configuration;
