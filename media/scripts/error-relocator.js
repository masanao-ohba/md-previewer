// Defensive fallback: Remove any Mermaid error elements from document.body
// Despite suppressErrorRendering: true and parse() before render(),
// Mermaid may still create error SVGs at body level in some edge cases.
(function relocateMermaidErrors() {
    // Setup MutationObserver to watch for error elements added to body
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // Element node
                    const element = node;

                    // Check if it's a Mermaid error element
                    // Common patterns: id="d", class contains "mermaidError" or "error-icon"
                    const isMermaidError = (
                        element.id === 'd' ||
                        element.classList?.contains('mermaidError') ||
                        element.id?.startsWith('mermaid-error') ||
                        (element.tagName === 'SVG' && element.querySelector('[class*="error"]'))
                    );

                    if (isMermaidError) {
                        console.warn('[Mermaid Error Cleanup] Removing stray Mermaid error element from body:', element.id || element.className);
                        element.remove();
                    }
                }
            });
        });
    });

    // Start observing document.body for added child nodes
    observer.observe(document.body, {
        childList: true,
        subtree: false // Only direct children of body
    });

    // Also clean up any existing error elements on initial load
    const existingErrors = document.querySelectorAll('body > svg[id="d"], body > .mermaidError, body > [id^="mermaid-error"]');
    if (existingErrors.length > 0) {
        console.warn(`[Mermaid Error Cleanup] Found ${existingErrors.length} existing error element(s) at body level, removing...`);
        existingErrors.forEach(el => el.remove());
    }
})();
