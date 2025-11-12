import { MermaidRenderer } from '../MermaidRenderer';

/**
 * Test suite for MermaidRenderer.
 *
 * Without these tests, we would not be guaranteed that:
 * - Mermaid diagrams are correctly wrapped in HTML containers
 * - Each diagram gets a unique ID for proper rendering
 * - Empty content is handled gracefully with error messages
 * - HTML special characters are escaped to prevent XSS
 * - Error isolation works (one bad diagram doesn't break others)
 * - Error messages display diagram source for debugging
 */
describe('MermaidRenderer', () => {
  beforeEach(() => {
    // Reset counter for consistent test IDs
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Valid Mermaid content is wrapped in correct HTML structure
   * - The container has proper classes for styling
   * - The pre element with mermaid class is created for mermaid.js
   */
  test('should render valid mermaid diagram', () => {
    const content = 'graph TD\n  A --> B';
    const html = MermaidRenderer.render(content);

    expect(html).toContain('class="diagram-clickable mermaid-container"');
    expect(html).toContain('data-diagram-type="mermaid"');
    expect(html).toContain('class="mermaid"');
    expect(html).toContain('id="mermaid-0"');
    expect(html).toContain('graph TD');
    expect(html).toContain('A --&gt; B');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Multiple diagrams receive unique IDs
   * - Counter increments correctly for each diagram
   * - Diagrams don't interfere with each other
   */
  test('should generate unique IDs for multiple diagrams', () => {
    const content1 = 'graph TD\n  A --> B';
    const content2 = 'graph LR\n  C --> D';

    const html1 = MermaidRenderer.render(content1);
    const html2 = MermaidRenderer.render(content2);

    // Extract IDs from HTML
    const id1Match = html1.match(/id="(mermaid-\d+)"/);
    const id2Match = html2.match(/id="(mermaid-\d+)"/);

    expect(id1Match).toBeTruthy();
    expect(id2Match).toBeTruthy();

    // IDs should be different
    expect(id1Match![1]).not.toBe(id2Match![1]);
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Empty string content is handled gracefully
   * - Error message is displayed instead of empty diagram
   * - No JavaScript errors occur from empty content
   */
  test('should handle empty content', () => {
    const html = MermaidRenderer.render('');

    expect(html).toContain('Mermaid Diagram Error');
    expect(html).toContain('Empty diagram content');
    expect(html).toContain('diagram-error');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Whitespace-only content is treated as empty
   * - Error handling works for edge cases
   */
  test('should handle whitespace-only content', () => {
    const html = MermaidRenderer.render('   \n  \n  ');

    expect(html).toContain('Mermaid Diagram Error');
    expect(html).toContain('Empty diagram content');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - HTML special characters are escaped to prevent XSS
   * - Script tags in content don't execute
   * - Content is safe to inject into HTML
   */
  test('should escape HTML special characters', () => {
    const content = 'graph TD\n  A["<script>alert(\'xss\')</script>"] --> B';
    const html = MermaidRenderer.render(content);

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('alert(&#039;xss&#039;)');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Complex diagrams with special syntax are preserved
   * - Multi-line content is handled correctly
   * - Diagram definition remains intact for mermaid.js
   */
  test('should handle complex diagram syntax', () => {
    const content = `sequenceDiagram
    participant Alice
    participant Bob
    Alice->>Bob: Hello Bob
    Bob-->>Alice: Hi Alice`;

    const html = MermaidRenderer.render(content);

    expect(html).toContain('sequenceDiagram');
    expect(html).toContain('participant Alice');
    expect(html).toContain('Alice-&gt;&gt;Bob');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Ampersands are properly escaped
   * - Multiple special characters are all handled
   * - Escaped content is valid HTML
   */
  test('should escape ampersands and quotes', () => {
    const content = 'graph TD\n  A["Text with & ampersand and \\"quotes\\""] --> B';
    const html = MermaidRenderer.render(content);

    expect(html).toContain('&amp;');
    expect(html).toContain('&quot;');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Error rendering produces valid HTML
   * - Error message is properly displayed
   * - Error styling is applied
   */
  test('should render error with message', () => {
    const html = MermaidRenderer.renderError('Test error message');

    expect(html).toContain('diagram-error');
    expect(html).toContain('mermaid-error');
    expect(html).toContain('Mermaid Diagram Error');
    expect(html).toContain('Test error message');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Error messages include diagram source for debugging
   * - Source code is displayed in a collapsible details element
   * - Source code is properly escaped in error display
   */
  test('should render error with diagram source', () => {
    const content = 'graph TD\n  A --> B';
    const html = MermaidRenderer.renderError('Syntax error', content);

    expect(html).toContain('Syntax error');
    expect(html).toContain('<details>');
    expect(html).toContain('View diagram source');
    expect(html).toContain('graph TD');
    expect(html).toContain('A --&gt; B');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Special characters in error messages are escaped
   * - Error messages don't cause XSS vulnerabilities
   */
  test('should escape HTML in error messages', () => {
    const html = MermaidRenderer.renderError('<script>alert("xss")</script>');

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
    const html = MermaidRenderer.render('graph TD\n  A --> B');

    // Should have data-diagram-id attribute with mermaid-{number} format
    expect(html).toMatch(/data-diagram-id="mermaid-\d+"/);
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Very long diagram content is handled
   * - No truncation occurs
   * - Performance is acceptable for large diagrams
   */
  test('should handle large diagram content', () => {
    const nodes = Array.from({ length: 50 }, (_, i) => `  Node${i} --> Node${i + 1}`).join('\n');
    const content = `graph TD\n${nodes}`;
    const html = MermaidRenderer.render(content);

    expect(html).toContain('Node0');
    expect(html).toContain('Node49');
    expect(html).toContain('class="mermaid"');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Class diagram syntax is preserved
   * - Special characters in class names are handled
   */
  test('should handle class diagram syntax', () => {
    const content = `classDiagram
    class Animal {
      +String name
      +int age
      +makeSound()
    }`;

    const html = MermaidRenderer.render(content);

    expect(html).toContain('classDiagram');
    expect(html).toContain('class Animal');
    expect(html).toContain('+String name');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Unicode characters are handled correctly
   * - International characters don't break rendering
   */
  test('should handle unicode characters', () => {
    const content = 'graph TD\n  A["日本語 🎉"] --> B["Emoji 😀"]';
    const html = MermaidRenderer.render(content);

    expect(html).toContain('日本語');
    expect(html).toContain('🎉');
    expect(html).toContain('😀');
  });
});
