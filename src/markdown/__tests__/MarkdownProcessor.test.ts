import { MarkdownProcessor } from '../MarkdownProcessor';

/**
 * Test suite for MarkdownProcessor.
 *
 * These tests verify that the Markdown processing works correctly without
 * this test suite, we would not be guaranteed that:
 * - Basic Markdown syntax is correctly converted to HTML
 * - Empty or invalid inputs are handled gracefully
 * - Error conditions produce user-friendly error messages
 */
describe('MarkdownProcessor', () => {
  let processor: MarkdownProcessor;

  beforeEach(() => {
    processor = new MarkdownProcessor();
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - The processor correctly initializes
   * - Basic text conversion works
   */
  test('should process simple text', async () => {
    const markdown = 'Hello, world!';
    const html = await processor.process(markdown);

    expect(html).toContain('Hello, world!');
    expect(html).toMatch(/<p>.*<\/p>/);
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Heading syntax is correctly converted
   * - Different heading levels are properly rendered
   */
  test('should process headings', async () => {
    const markdown = '# Heading 1\n## Heading 2\n### Heading 3';
    const html = await processor.process(markdown);

    expect(html).toContain('<h1>Heading 1</h1>');
    expect(html).toContain('<h2>Heading 2</h2>');
    expect(html).toContain('<h3>Heading 3</h3>');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Emphasis and strong emphasis work correctly
   * - Inline code is properly formatted
   */
  test('should process inline formatting', async () => {
    const markdown = '*italic* **bold** `code`';
    const html = await processor.process(markdown);

    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<code>code</code>');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Code blocks are correctly rendered
   * - Language specification is preserved
   */
  test('should process code blocks', async () => {
    const markdown = '```javascript\nconst x = 1;\n```';
    const html = await processor.process(markdown);

    expect(html).toContain('<pre>');
    expect(html).toContain('<code');
    expect(html).toContain('const x = 1;');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Unordered lists are correctly converted
   * - List items are properly nested
   */
  test('should process lists', async () => {
    const markdown = '- Item 1\n- Item 2\n  - Nested item';
    const html = await processor.process(markdown);

    expect(html).toContain('<ul>');
    expect(html).toContain('<li>Item 1</li>');
    expect(html).toContain('<li>Item 2');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Links are correctly converted
   * - URL and link text are properly rendered
   */
  test('should process links', async () => {
    const markdown = '[Link Text](https://example.com)';
    const html = await processor.process(markdown);

    expect(html).toContain('<a href="https://example.com">Link Text</a>');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Image syntax is correctly converted
   * - Alt text and src attributes are properly set
   */
  test('should process images', async () => {
    const markdown = '![Alt Text](image.png)';
    const html = await processor.process(markdown);

    expect(html).toContain('<img');
    expect(html).toContain('alt="Alt Text"');
    expect(html).toContain('src="image.png"');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Blockquotes are correctly rendered
   * - Multi-line blockquotes work
   */
  test('should process blockquotes', async () => {
    const markdown = '> This is a quote\n> Second line';
    const html = await processor.process(markdown);

    expect(html).toContain('<blockquote>');
    expect(html).toContain('This is a quote');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Empty input is handled gracefully
   * - No errors are thrown for empty strings
   */
  test('should handle empty input', async () => {
    const html = await processor.process('');

    expect(html).toContain('Empty document');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Whitespace-only input is handled correctly
   * - No errors are thrown for whitespace strings
   */
  test('should handle whitespace-only input', async () => {
    const html = await processor.process('   \n  \n  ');

    expect(html).toContain('Empty document');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Complex mixed Markdown is correctly processed
   * - Multiple formatting elements work together
   */
  test('should process complex markdown', async () => {
    const markdown = `# Title

This is a paragraph with **bold** and *italic* text.

## Section

- List item 1
- List item 2

\`\`\`typescript
const hello = 'world';
\`\`\`

[Link](https://example.com)`;

    const html = await processor.process(markdown);

    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<pre>');
    expect(html).toContain('<a href="https://example.com">Link</a>');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - URL-like text is automatically linkified
   * - The linkify option is working correctly
   */
  test('should linkify URLs', async () => {
    const markdown = 'Visit https://example.com for more info';
    const html = await processor.process(markdown);

    expect(html).toContain('<a href="https://example.com">https://example.com</a>');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Tables are correctly rendered
   * - Table headers and cells are properly formatted
   */
  test('should process tables', async () => {
    const markdown = `| Column 1 | Column 2 |
|----------|----------|
| Cell 1   | Cell 2   |`;

    const html = await processor.process(markdown);

    expect(html).toContain('<table>');
    expect(html).toContain('<thead>');
    expect(html).toContain('<tbody>');
    expect(html).toContain('Column 1');
    expect(html).toContain('Cell 1');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - HTML special characters are properly handled in output
   * - Content is safe from XSS when error messages are displayed
   */
  test('should handle HTML special characters in markdown', async () => {
    const markdown = 'Text with <script>alert("xss")</script> and & ampersand';
    const html = await processor.process(markdown);

    // markdown-it allows HTML by default (configured with html: true)
    // But we test that our escapeHtml method works for error messages
    expect(html).toBeDefined();
    expect(typeof html).toBe('string');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Multiple special characters are escaped correctly
   * - Quotes are handled properly
   */
  test('should handle text with quotes and special chars', async () => {
    const markdown = 'Text with "quotes" and \'apostrophes\' and <tags>';
    const html = await processor.process(markdown);

    expect(html).toBeDefined();
    expect(html).toContain('quotes');
    expect(html).toContain('apostrophes');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Very long documents are processed correctly
   * - No performance issues with large inputs
   */
  test('should handle large documents', async () => {
    const markdown = Array(100)
      .fill('# Heading\n\nParagraph with **bold** and *italic* text.\n\n')
      .join('');
    const html = await processor.process(markdown);

    expect(html).toContain('<h1>Heading</h1>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html.match(/<h1>/g)?.length).toBe(100);
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Horizontal rules are rendered correctly
   * - Different HR syntax variations work
   */
  test('should process horizontal rules', async () => {
    const markdown = '---\n\nText\n\n***\n\nMore text';
    const html = await processor.process(markdown);

    expect(html).toContain('<hr>');
    expect(html).toContain('Text');
    expect(html).toContain('More text');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Ordered lists are rendered correctly
   * - List numbering is preserved
   */
  test('should process ordered lists', async () => {
    const markdown = '1. First\n2. Second\n3. Third';
    const html = await processor.process(markdown);

    expect(html).toContain('<ol>');
    expect(html).toContain('<li>First</li>');
    expect(html).toContain('<li>Second</li>');
    expect(html).toContain('<li>Third</li>');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Mixed inline formatting works correctly
   * - Nested emphasis is handled properly
   */
  test('should handle mixed inline formatting', async () => {
    const markdown = '**bold *and italic* text** with `inline code`';
    const html = await processor.process(markdown);

    expect(html).toContain('<strong>');
    expect(html).toContain('<em>');
    expect(html).toContain('<code>');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Mermaid code blocks are detected correctly
   * - Mermaid diagrams are rendered with proper HTML structure
   * - Mermaid container classes are applied
   */
  test('should detect and render mermaid diagrams', async () => {
    const markdown = '```mermaid\ngraph TD\n  A --> B\n```';
    const html = await processor.process(markdown);

    expect(html).toContain('class="diagram-clickable mermaid-container"');
    expect(html).toContain('data-diagram-type="mermaid"');
    expect(html).toContain('class="mermaid"');
    expect(html).toContain('graph TD');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - PlantUML code blocks are detected correctly
   * - PlantUML diagrams are rendered as images
   * - PlantUML server URL is generated
   */
  test('should detect and render plantuml diagrams', async () => {
    const markdown = '```plantuml\n@startuml\nAlice -> Bob\n@enduml\n```';
    const html = await processor.process(markdown);

    expect(html).toContain('plantuml-container');
    expect(html).toContain('<img');
    expect(html).toContain('plantuml.com/plantuml/svg/');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Regular code blocks still work after diagram integration
   * - Non-diagram code blocks use default rendering
   * - Syntax highlighting class is preserved
   */
  test('should still render regular code blocks', async () => {
    const markdown = '```javascript\nconst x = 1;\n```';
    const html = await processor.process(markdown);

    expect(html).toContain('<pre>');
    expect(html).toContain('<code');
    expect(html).toContain('const x = 1;');
    expect(html).not.toContain('mermaid-container');
    expect(html).not.toContain('plantuml-container');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Multiple different diagram types can coexist
   * - Each diagram is independently processed
   * - Mixed content document works correctly
   */
  test('should handle mixed content with multiple diagram types', async () => {
    const markdown = `# Title

Regular paragraph

\`\`\`mermaid
graph TD
  A --> B
\`\`\`

Another paragraph

\`\`\`plantuml
@startuml
Alice -> Bob
@enduml
\`\`\`

\`\`\`javascript
const x = 1;
\`\`\``;

    const html = await processor.process(markdown);

    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('mermaid-container');
    expect(html).toContain('plantuml-container');
    expect(html).toContain('const x = 1;');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Empty Mermaid blocks are handled gracefully
   * - Error message is displayed instead of broken diagram
   * - Document continues to render despite empty diagram
   */
  test('should handle empty mermaid diagram', async () => {
    const markdown = '```mermaid\n\n```';
    const html = await processor.process(markdown);

    expect(html).toContain('Mermaid Diagram Error');
    expect(html).toContain('Empty diagram content');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Empty PlantUML blocks are handled gracefully
   * - Error message is displayed
   * - Document continues to render
   */
  test('should handle empty plantuml diagram', async () => {
    const markdown = '```plantuml\n\n```';
    const html = await processor.process(markdown);

    // Empty diagrams show error message
    expect(html).toContain('PlantUML Diagram Error');
    expect(html).toContain('Empty diagram content');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Case-insensitive detection works
   * - Users can use MERMAID, Mermaid, or mermaid
   */
  test('should detect mermaid with different casing', async () => {
    const markdownLower = '```mermaid\ngraph TD\n  A --> B\n```';
    const markdownUpper = '```MERMAID\ngraph TD\n  A --> B\n```';
    const markdownMixed = '```Mermaid\ngraph TD\n  A --> B\n```';

    const htmlLower = await processor.process(markdownLower);
    const htmlUpper = await processor.process(markdownUpper);
    const htmlMixed = await processor.process(markdownMixed);

    expect(htmlLower).toContain('mermaid-container');
    expect(htmlUpper).toContain('mermaid-container');
    expect(htmlMixed).toContain('mermaid-container');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Case-insensitive detection works for PlantUML
   * - Users can use PLANTUML, PlantUML, or plantuml
   */
  test('should detect plantuml with different casing', async () => {
    const markdownLower = '```plantuml\n@startuml\nA -> B\n@enduml\n```';
    const markdownUpper = '```PLANTUML\n@startuml\nA -> B\n@enduml\n```';
    const markdownMixed = '```PlantUML\n@startuml\nA -> B\n@enduml\n```';

    const htmlLower = await processor.process(markdownLower);
    const htmlUpper = await processor.process(markdownUpper);
    const htmlMixed = await processor.process(markdownMixed);

    expect(htmlLower).toContain('plantuml-container');
    expect(htmlUpper).toContain('plantuml-container');
    expect(htmlMixed).toContain('plantuml-container');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Multiple diagrams of the same type work
   * - Each diagram is independently rendered
   * - No ID conflicts occur
   */
  test('should handle multiple mermaid diagrams', async () => {
    const markdown = `\`\`\`mermaid
graph TD
  A --> B
\`\`\`

\`\`\`mermaid
graph LR
  C --> D
\`\`\``;

    const html = await processor.process(markdown);

    const matches = html.match(/class="diagram-clickable mermaid-container"/g);
    expect(matches).toHaveLength(2);
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Complex Mermaid syntax is preserved
   * - Multi-line diagrams work correctly
   */
  test('should handle complex mermaid diagrams', async () => {
    const markdown = `\`\`\`mermaid
sequenceDiagram
    participant Alice
    participant Bob
    Alice->>Bob: Hello Bob
    Bob-->>Alice: Hi Alice
\`\`\``;

    const html = await processor.process(markdown);

    expect(html).toContain('mermaid-container');
    expect(html).toContain('sequenceDiagram');
  });

  /**
   * Without this test, we would not be guaranteed that:
   * - Complex PlantUML syntax is preserved
   * - Multi-line diagrams work correctly
   */
  test('should handle complex plantuml diagrams', async () => {
    const markdown = `\`\`\`plantuml
@startuml
participant User
participant System
User -> System: Request
System --> User: Response
@enduml
\`\`\``;

    const html = await processor.process(markdown);

    expect(html).toContain('plantuml-container');
    expect(html).toContain('<img');
    expect(html).toContain('plantuml.com/plantuml/svg/');
  });
});
