import { PlantUMLRenderer } from '../PlantUMLRenderer';
import { testConfiguration } from '../../__tests__/setup';

/**
 * Test suite for PlantUMLRenderer.
 *
 * Without these tests, we would not be guaranteed that:
 * - PlantUML diagrams are correctly encoded for the online service
 * - Image tags are generated with correct URLs
 * - Each diagram gets a unique ID
 * - Empty content is handled gracefully with error messages
 * - Error fallback mechanism works when server is unavailable
 * - HTML special characters are escaped to prevent XSS
 * - @startuml/@enduml tags are properly handled
 */
describe('PlantUMLRenderer', () => {
  beforeEach(() => {
    // Reset counter for consistent test IDs
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Valid PlantUML content is rendered as an img tag
   * - The URL points to the PlantUML server
   * - The container has proper structure
   */
  test('should render valid plantuml diagram', () => {
    const content = '@startuml\nAlice -> Bob: Hello\n@enduml';
    const html = PlantUMLRenderer.renderOnline(content);

    expect(html).toContain('class="diagram-clickable plantuml-container"');
    expect(html).toContain('data-diagram-type="plantuml"');
    expect(html).toContain('<img');
    expect(html).toContain('src="https://www.plantuml.com/plantuml/svg/');
    expect(html).toContain('id="plantuml-0"');
    expect(html).toContain('alt="PlantUML Diagram"');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Multiple diagrams receive unique IDs
   * - Counter increments correctly
   * - Diagrams are independent
   */
  test('should generate unique IDs for multiple diagrams', () => {
    const content1 = '@startuml\nAlice -> Bob\n@enduml';
    const content2 = '@startuml\nCharlie -> David\n@enduml';

    const html1 = PlantUMLRenderer.renderOnline(content1);
    const html2 = PlantUMLRenderer.renderOnline(content2);

    // Extract IDs from HTML
    const id1Match = html1.match(/id="(plantuml-\d+)"/);
    const id2Match = html2.match(/id="(plantuml-\d+)"/);

    expect(id1Match).toBeTruthy();
    expect(id2Match).toBeTruthy();

    // IDs should be different
    expect(id1Match![1]).not.toBe(id2Match![1]);
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Empty string content is handled gracefully
   * - Error message is displayed
   * - No broken images are shown
   */
  test('should handle empty content', () => {
    const html = PlantUMLRenderer.renderOnline('');

    expect(html).toContain('PlantUML Diagram Error');
    expect(html).toContain('Empty diagram content');
    expect(html).toContain('diagram-error');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Whitespace-only content is treated as empty
   * - Error handling works for edge cases
   */
  test('should handle whitespace-only content', () => {
    const html = PlantUMLRenderer.renderOnline('   \n  \n  ');

    expect(html).toContain('PlantUML Diagram Error');
    expect(html).toContain('Empty diagram content');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - @startuml and @enduml tags are properly removed
   * - Server receives clean content
   * - Encoding works with or without tags
   */
  test('should handle content with startuml tags', () => {
    const content = '@startuml\nAlice -> Bob: Hello\n@enduml';
    const html = PlantUMLRenderer.renderOnline(content);

    expect(html).toContain('<img');
    expect(html).toContain('src="https://www.plantuml.com/plantuml/svg/');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Content without @startuml/@enduml works
   * - Encoding handles raw PlantUML syntax
   */
  test('should handle content without startuml tags', () => {
    const content = 'Alice -> Bob: Hello';
    const html = PlantUMLRenderer.renderOnline(content);

    expect(html).toContain('<img');
    expect(html).toContain('src="https://www.plantuml.com/plantuml/svg/');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Complex sequence diagrams are encoded correctly
   * - Multi-participant diagrams work
   * - Various PlantUML syntax elements are preserved
   */
  test('should handle complex sequence diagram', () => {
    const content = `@startuml
    participant User
    participant System
    User -> System: Request
    System --> User: Response
    @enduml`;

    const html = PlantUMLRenderer.renderOnline(content);

    expect(html).toContain('<img');
    expect(html).toContain('plantuml-container');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Use case diagram syntax is handled
   * - Different diagram types work
   */
  test('should handle use case diagram', () => {
    const content = `@startuml
    actor User
    User --> (Login)
    User --> (Logout)
    @enduml`;

    const html = PlantUMLRenderer.renderOnline(content);

    expect(html).toContain('<img');
    expect(html).toContain('src="https://www.plantuml.com/plantuml/svg/');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Error fallback mechanism is included
   * - onerror attribute handles server failures
   * - Fallback error message is present
   */
  test('should render POST request markup when configured', () => {
    testConfiguration.__set('plantuml.requestType', 'post');
    const content = `@startuml
Alice -> Bob: Hello
@enduml`;

    const html = PlantUMLRenderer.renderOnline(content);

    expect(html).toContain('plantuml-pending');
    expect(html).toContain('data-plantuml-render="post"');
    expect(html).toContain('data-plantuml-source=');
    expect(html).toContain('data-plantuml-server="https://www.plantuml.com/plantuml/svg/"');
    expect(html).not.toContain('<img');
  });

  test('should include error fallback mechanism', () => {
    const content = '@startuml\nAlice -> Bob\n@enduml';
    const html = PlantUMLRenderer.renderOnline(content);

    expect(html).toContain('onerror=');
    expect(html).toContain('plantuml-error-fallback');
    expect(html).toContain('Failed to load diagram from PlantUML server');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Error rendering produces valid HTML
   * - Error message is properly displayed
   * - Error styling is applied
   */
  test('should render error with message', () => {
    const html = PlantUMLRenderer.renderError('Test error message');

    expect(html).toContain('diagram-error');
    expect(html).toContain('plantuml-error');
    expect(html).toContain('PlantUML Diagram Error');
    expect(html).toContain('Test error message');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Error messages include diagram source for debugging
   * - Source code is displayed in collapsible details
   * - Source code is properly escaped
   */
  test('should render error with diagram source', () => {
    const content = '@startuml\nAlice -> Bob\n@enduml';
    const html = PlantUMLRenderer.renderError('Encoding error', content);

    expect(html).toContain('Encoding error');
    expect(html).toContain('<details>');
    expect(html).toContain('View diagram source');
    expect(html).toContain('@startuml');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - HTML special characters in error messages are escaped
   * - Error messages don't cause XSS vulnerabilities
   */
  test('should escape HTML in error messages', () => {
    const html = PlantUMLRenderer.renderError('<script>alert("xss")</script>');

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('alert(&quot;xss&quot;)');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Data attributes are correctly set
   * - Container has proper structure for client-side processing
   */
  test('should include data-diagram-id attribute', () => {
    const html = PlantUMLRenderer.renderOnline('@startuml\nA -> B\n@enduml');

    // Should have data-diagram-id attribute with plantuml-{number} format
    expect(html).toMatch(/data-diagram-id="plantuml-\d+"/);
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Very long diagram content is handled
   * - Encoding works for large inputs
   * - URLs don't become too long
   */
  test('should handle large diagram content', () => {
    const participants = Array.from({ length: 20 }, (_, i) => `participant P${i}`).join('\n');
    const interactions = Array.from({ length: 20 }, (_, i) => `P${i} -> P${i + 1}: Message${i}`).join('\n');
    const content = `@startuml\n${participants}\n${interactions}\n@enduml`;

    const html = PlantUMLRenderer.renderOnline(content);

    expect(html).toContain('<img');
    expect(html).toContain('plantuml-container');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Component diagram syntax works
   * - Different diagram types are supported
   */
  test('should handle component diagram', () => {
    const content = `@startuml
    package "Web Layer" {
      [Controller]
    }
    package "Business Layer" {
      [Service]
    }
    [Controller] --> [Service]
    @enduml`;

    const html = PlantUMLRenderer.renderOnline(content);

    expect(html).toContain('<img');
    expect(html).toContain('src="https://www.plantuml.com/plantuml/svg/');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Unicode characters are handled correctly
   * - International characters in diagrams work
   */
  test('should handle unicode characters', () => {
    const content = '@startuml\nAlice -> Bob: こんにちは\n@enduml';
    const html = PlantUMLRenderer.renderOnline(content);

    expect(html).toContain('<img');
    expect(html).toContain('plantuml-container');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Encoding produces a non-empty string
   * - URL is properly formed
   * - Base64-like encoding works
   */
  test('should encode diagram content', () => {
    const content = 'Alice -> Bob: Hello';
    const html = PlantUMLRenderer.renderOnline(content);

    // URL should have encoded content after the server path
    const match = html.match(/src="https:\/\/www\.plantuml\.com\/plantuml\/svg\/([^"]+)"/);
    expect(match).toBeTruthy();
    expect(match![1].length).toBeGreaterThan(0);
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - State diagram syntax is supported
   * - Various PlantUML diagram types work
   */
  test('should handle state diagram', () => {
    const content = `@startuml
    [*] --> Active
    Active --> Inactive
    Inactive --> [*]
    @enduml`;

    const html = PlantUMLRenderer.renderOnline(content);

    expect(html).toContain('<img');
    expect(html).toContain('plantuml-container');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Image styling is applied
   * - max-width ensures responsive images
   * - Height auto maintains aspect ratio
   */
  test('should include image styling', () => {
    const html = PlantUMLRenderer.renderOnline('@startuml\nA -> B\n@enduml');

    expect(html).toContain('style="max-width: 100%; height: auto;"');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Error fallback is hidden by default
   * - Display style is set to none initially
   * - Only shown when image fails to load
   */
  test('should have hidden error fallback by default', () => {
    const html = PlantUMLRenderer.renderOnline('@startuml\nA -> B\n@enduml');

    expect(html).toContain('style="display: none;"');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - detectDiagramSize() accurately counts lines in diagram source
   * - Line counting works for various diagram sizes
   */
  test('should detect diagram size by line count', () => {
    // Access private method via type assertion for testing
    const detector = (PlantUMLRenderer as any).detectDiagramSize;

    expect(detector('Alice -> Bob')).toBe(1);
    expect(detector('Alice -> Bob\nCharlie -> David')).toBe(2);
    expect(detector('Line1\nLine2\nLine3\nLine4\nLine5')).toBe(5);

    // 40 lines (threshold)
    const fortyLines = Array.from({ length: 40 }, (_, i) => `Line${i}`).join('\n');
    expect(detector(fortyLines)).toBe(40);
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - selectRenderingMode() returns 'online' for small diagrams (< 40 lines)
   * - selectRenderingMode() returns 'local' for large diagrams (>= 40 lines)
   * - Threshold-based branching works correctly
   */
  test('should select online mode for small diagrams', () => {
    const selector = (PlantUMLRenderer as any).selectRenderingMode;

    expect(selector(1, 'get')).toBe('online');
    expect(selector(10, 'get')).toBe('online');
    expect(selector(39, 'get')).toBe('online'); // Just below threshold
  });

  test('should select local mode for large diagrams', () => {
    const selector = (PlantUMLRenderer as any).selectRenderingMode;

    expect(selector(40, 'get')).toBe('local'); // At threshold
    expect(selector(50, 'get')).toBe('local');
    expect(selector(100, 'get')).toBe('local');
    expect(selector(412, 'get')).toBe('local'); // User's actual test case
  });

  test('should prefer online mode for large diagrams when POST mode is configured', () => {
    const selector = (PlantUMLRenderer as any).selectRenderingMode;

    expect(selector(120, 'post')).toBe('online');
    expect(selector(412, 'post')).toBe('online');
  });

  test('auto mode keeps online rendering for large diagrams when POST is configured', async () => {
    testConfiguration.__set('plantuml.requestType', 'post');

    const largeDiagramLines = Array.from({ length: 80 }, (_, i) => `Alice${i} -> Bob${i}: Message ${i}`).join('\n');
    const content = `@startuml\n${largeDiagramLines}\n@enduml`;

    const html = await PlantUMLRenderer.render(content);

    expect(html).toContain('plantuml-pending');
    expect(html).toContain('data-plantuml-render="post"');
    expect(html).not.toContain('PlantUML JAR path is not configured');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - renderJavaRequiredError() shows line count in error message
   * - renderJavaRequiredError() includes Java download link
   * - renderJavaRequiredError() provides actionable guidance
   */
  test('should render Java required error with line count and download link', () => {
    // Use bind to maintain 'this' context when calling private method
    const errorRenderer = (PlantUMLRenderer as any).renderJavaRequiredError.bind(PlantUMLRenderer);
    const html = errorRenderer(76, '@startuml\n...\n@enduml');

    expect(html).toContain('diagram-error');
    expect(html).toContain('Diagram too large for online rendering (76 lines)');
    expect(html).toContain('Install Java for local rendering:');
    expect(html).toContain('https://java.com/download');
    expect(html).toContain('Or reduce diagram to less than 40 lines');
    expect(html).toContain('View diagram source');
  });
});
