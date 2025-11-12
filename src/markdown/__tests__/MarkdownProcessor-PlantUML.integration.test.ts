/**
 * Integration Test: MarkdownProcessor + PlantUMLRenderer
 *
 * Purpose: Verify that MarkdownProcessor correctly integrates with PlantUMLRenderer.
 * Without this test, we cannot guarantee that PlantUML code blocks are actually
 * rendered using PlantUMLRenderer (as was the case in the original bug where
 * PlantUMLRenderer was fully implemented but never called).
 *
 * This test verifies:
 * 1. MarkdownProcessor detects PlantUML code blocks
 * 2. MarkdownProcessor calls PlantUMLRenderer.renderOnline()
 * 3. The result contains actual image tags, not placeholders
 */

import { MarkdownProcessor } from '../MarkdownProcessor';

describe('Integration: MarkdownProcessor + PlantUMLRenderer', () => {
  let processor: MarkdownProcessor;

  beforeEach(() => {
    processor = new MarkdownProcessor();
  });

  describe('PlantUML Block Detection and Rendering', () => {
    test('should render PlantUML block as image tag, not placeholder', async () => {
      const markdown = `
# Test Document

\`\`\`plantuml
Alice -> Bob: Hello
Bob -> Alice: Hi there
\`\`\`

Some text after diagram.
`;

      const html = await processor.process(markdown);

      // Critical verification: Must contain actual image tag
      expect(html).toContain('<img');
      expect(html).toContain('src="https://www.plantuml.com/plantuml/svg/');

      // Critical anti-pattern: Must NOT contain placeholder elements
      expect(html).not.toContain('plantuml-pending');
      expect(html).not.toContain('Loading PlantUML diagram');
      expect(html).not.toContain('plantuml-source'); // Should not show source code

      // Verify PlantUML container is present
      expect(html).toContain('plantuml-container');
    });

    test('should encode PlantUML source in URL', async () => {
      const markdown = `\`\`\`plantuml
A -> B
\`\`\``;

      const html = await processor.process(markdown);

      // FIX 3: URL should contain ~1 prefix for DEFLATE format
      expect(html).toMatch(/plantuml\.com\/plantuml\/svg\/~1[A-Za-z0-9_-]+/);
    });

    test('should render multiple PlantUML diagrams independently', async () => {
      const markdown = `
\`\`\`plantuml
Alice -> Bob
\`\`\`

\`\`\`plantuml
Charlie -> Dave
\`\`\`
`;

      const html = await processor.process(markdown);

      // Should have 2 separate PlantUML containers (now wrapped with zoom controls)
      const containerMatches = html.match(/plantuml-container/g);
      expect(containerMatches).toHaveLength(2);

      // Should have 2 separate diagram zoom containers
      const zoomContainerMatches = html.match(/data-diagram-id="plantuml-\d+"/g);
      expect(zoomContainerMatches).toHaveLength(2);

      // Should have 2 separate image tags
      const imgMatches = html.match(/<img/g);
      expect(imgMatches?.length).toBeGreaterThanOrEqual(2);
    });

    test('should handle empty PlantUML block with error message', async () => {
      const markdown = `\`\`\`plantuml
\`\`\``;

      const html = await processor.process(markdown);

      // Should contain error message
      expect(html).toContain('PlantUML Diagram Error');
      expect(html).toContain('Empty diagram content');
      expect(html).toContain('diagram-error');
    });

    test('should preserve other markdown content around PlantUML', async () => {
      const markdown = `
# Architecture

This is the system architecture:

\`\`\`plantuml
@startuml
Alice -> Bob: Request
Bob -> Alice: Response
@enduml
\`\`\`

## Details

More text here.
`;

      const html = await processor.process(markdown);

      // Verify heading is rendered
      expect(html).toContain('<h1>Architecture</h1>');
      expect(html).toContain('<h2>Details</h2>');

      // Verify paragraphs are rendered
      expect(html).toContain('This is the system architecture:');
      expect(html).toContain('More text here.');

      // Verify PlantUML is rendered as image
      expect(html).toContain('<img');
      expect(html).toContain('plantuml.com/plantuml/svg/');
    });
  });

  describe('Integration with Mermaid (should not interfere)', () => {
    test('should render both PlantUML and Mermaid in same document', async () => {
      const markdown = `
\`\`\`mermaid
graph TD
  A --> B
\`\`\`

\`\`\`plantuml
Alice -> Bob
\`\`\`
`;

      const html = await processor.process(markdown);

      // Mermaid should be present
      expect(html).toContain('mermaid-container');

      // PlantUML should be present
      expect(html).toContain('plantuml-container');
      expect(html).toContain('<img');

      // Should NOT mix up the two
      expect(html).not.toContain('plantuml-pending');
    });
  });

  describe('Anti-Pattern Verification', () => {
    test('PlantUML blocks should NOT show source code in final output', async () => {
      const markdown = `\`\`\`plantuml
Alice -> Bob: Secret message
\`\`\``;

      const html = await processor.process(markdown);

      // Should NOT contain the raw source code visible in final render
      // (unless it's in an error message)
      if (!html.includes('PlantUML Diagram Error')) {
        expect(html).not.toContain('Secret message');
      }

      // Should contain image instead
      expect(html).toContain('<img');
    });

    test('PlantUML blocks should NOT show "Loading..." in final output', async () => {
      const markdown = `\`\`\`plantuml
A -> B
\`\`\``;

      const html = await processor.process(markdown);

      // Critical: Must NOT show loading state
      expect(html).not.toContain('Loading');
      expect(html).not.toContain('loading');

      // Should show actual rendered output
      expect(html).toContain('<img');
    });
  });

  describe('Edge Cases', () => {
    test('should handle PlantUML with @startuml/@enduml tags', async () => {
      const markdown = `\`\`\`plantuml
@startuml
Alice -> Bob
@enduml
\`\`\``;

      const html = await processor.process(markdown);

      expect(html).toContain('<img');
      expect(html).toContain('plantuml.com');
    });

    test('should handle PlantUML without @startuml/@enduml tags', async () => {
      const markdown = `\`\`\`plantuml
Alice -> Bob
\`\`\``;

      const html = await processor.process(markdown);

      expect(html).toContain('<img');
      expect(html).toContain('plantuml.com');
    });

    test('should handle whitespace in PlantUML blocks', async () => {
      const markdown = `\`\`\`plantuml

  Alice -> Bob

\`\`\``;

      const html = await processor.process(markdown);

      expect(html).toContain('<img');
    });

    test('should render large diagrams (>40 lines) using online mode by default', async () => {
      // Create a diagram with 100 lines (well above the old 40-line threshold)
      const lines = Array.from({ length: 100 }, (_, i) => `P${i} -> P${i + 1}: Message${i}`);
      const markdown = `\`\`\`plantuml
@startuml
${lines.join('\n')}
@enduml
\`\`\``;

      const html = await processor.process(markdown);

      // Should use online mode (not Java/local mode)
      expect(html).toContain('src="https://www.plantuml.com/plantuml/svg/');
      expect(html).toContain('<img');

      // Should NOT show Java required error
      expect(html).not.toContain('Diagram too large for online rendering');
      expect(html).not.toContain('Install Java for local rendering');
    });

    test('should render very large diagrams (>400 lines) using online mode by default', async () => {
      // Create a diagram with 410 lines (matching user's real-world test case)
      const lines = Array.from({ length: 410 }, (_, i) => `Line${i}`);
      const markdown = `\`\`\`plantuml
@startuml
${lines.join('\n')}
@enduml
\`\`\``;

      const html = await processor.process(markdown);

      // Should use online mode even for very large diagrams
      expect(html).toContain('src="https://www.plantuml.com/plantuml/svg/');
      expect(html).toContain('<img');

      // Should NOT show error about diagram being too large
      expect(html).not.toContain('Diagram too large');
      expect(html).not.toContain('Install Java');
    });
  });
});
