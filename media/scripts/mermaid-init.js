// Initialize Mermaid diagrams
(function initializeMermaid() {
    try {
        // Configure Mermaid
        mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            suppressErrorRendering: true
        });

        // Find all Mermaid diagram containers
        const mermaidElements = document.querySelectorAll('pre.mermaid');

        // Render each diagram with error isolation
        mermaidElements.forEach((element, index) => {
            try {
                const diagramId = element.id || `mermaid-${index}`;
                const diagramDefinition = element.textContent;

                // Create a container for the rendered diagram
                const container = document.createElement('div');
                container.id = `mermaid-output-${index}`;

                // IMPORTANT: Parse first to catch errors BEFORE render()
                // This prevents Mermaid from creating error SVGs in the document body
                mermaid.parse(diagramDefinition).then(() => {
                    // If parse succeeds, render the diagram
                    return mermaid.render(diagramId + '-svg', diagramDefinition);
                }).then(result => {
                    container.innerHTML = result.svg;
                    // CRITICAL: Add .diagram-clickable class for modal zoom functionality
                    // Without this class, the click event handler cannot detect diagram clicks
                    // Server-side MermaidRenderer adds this, but client-side rendering bypasses that wrapper
                    container.classList.add('diagram-clickable', 'mermaid-container');
                    container.setAttribute('data-diagram-type', 'mermaid');
                    element.parentElement.replaceChild(container, element);
                }).catch(error => {
                    // Show error message if rendering fails
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'diagram-error mermaid-error';
                    errorDiv.style.cssText = 'border: 2px solid #f85149; border-radius: 6px; padding: 16px; margin: 16px 0; background-color: #fff8f6;';

                    // Escape HTML in error message and diagram source
                    const escapeHtml = (text) => {
                        const div = document.createElement('div');
                        div.textContent = text;
                        return div.innerHTML;
                    };

                    // Extract line number from error object (Mermaid 10+ uses error.hash.line which is 0-indexed)
                    // Fallback to parsing error message string for other error types
                    const errorLine = error.hash?.line !== undefined
                        ? error.hash.line + 1  // Convert from 0-indexed to 1-indexed
                        : (() => {
                            const lineMatch = error.message?.match(/line[\s:]+?(\d+)/i);
                            return lineMatch ? parseInt(lineMatch[1], 10) : null;
                        })();

                    // Format source code with line numbers and highlighting
                    const formatSourceWithHighlight = (source, errorLineNum) => {
                        const lines = source.split('\n');

                        // If error line is known, show context (±2 lines)
                        if (errorLineNum) {
                            const contextLines = 2;
                            const startLine = Math.max(1, errorLineNum - contextLines);
                            const endLine = Math.min(lines.length, errorLineNum + contextLines);

                            const contextHTML = [];
                            for (let i = startLine - 1; i < endLine; i++) {
                                const lineNum = i + 1;
                                const line = lines[i];
                                const isErrorLine = lineNum === errorLineNum;
                                const bgColor = isErrorLine ? '#ffe8e6' : 'transparent';
                                const lineNumColor = isErrorLine ? '#f85149' : '#57606a';
                                const fontWeight = isErrorLine ? 'bold' : 'normal';

                                contextHTML.push(`<div style="display: flex; background-color: ${bgColor};">
                                    <span style="color: ${lineNumColor}; font-weight: ${fontWeight}; min-width: 40px; padding-right: 12px; text-align: right; user-select: none; border-right: 1px solid #d0d7de; margin-right: 12px;">${lineNum}</span>
                                    <span style="font-weight: ${fontWeight}; flex: 1;">${escapeHtml(line) || ' '}</span>
                                </div>`);
                            }
                            return contextHTML.join('');
                        } else {
                            // No error line info - return empty (will show fixed message)
                            return null;
                        }
                    };

                    const sourceHTML = formatSourceWithHighlight(diagramDefinition, errorLine);

                    errorDiv.innerHTML = `
                        <div style="display: flex; align-items: center; margin-bottom: 8px;">
                            <strong style="color: #f85149;">Mermaid Syntax Error</strong>
                        </div>
                        <p style="margin: 8px 0; color: #57606a;">${escapeHtml(error.message || 'Failed to render diagram')}</p>
                        ${sourceHTML ? `
                            <details>
                                <summary style="cursor: pointer; color: #0969da; font-weight: 600; list-style: none;">
                                    <span style="text-decoration: none;">▶ View error context</span>
                                </summary>
                                <pre style="margin-top: 8px; padding: 12px; background-color: #f6f8fa; border-radius: 6px; overflow-x: auto; font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace; font-size: 13px; line-height: 1.5;"><code style="display: block;">${sourceHTML}</code></pre>
                            </details>
                        ` : ''}
                    `;
                    element.parentElement.replaceChild(errorDiv, element);
                });
            } catch (error) {
                console.error('Error processing Mermaid diagram:', error);
                // Leave the element as-is if there's an error
            }
        });
    } catch (error) {
        console.error('Failed to initialize Mermaid:', error);
    }
})();
