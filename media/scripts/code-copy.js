// Code Copy Button functionality
(function initializeCodeCopy() {
    'use strict';

    /**
     * Code Copy Button Manager
     * Handles copying code and diagram source to clipboard with visual feedback
     */
    const CodeCopyManager = {
        /**
         * Initialize copy button functionality
         */
        init: function() {
            // Use event delegation for better performance
            document.addEventListener('click', this.handleClick.bind(this));
            document.addEventListener('keydown', this.handleKeydown.bind(this));
        },

        /**
         * Handle click events on copy buttons
         */
        handleClick: function(event) {
            const button = event.target.closest('.copy-code-button');
            if (!button) return;

            event.preventDefault();
            this.copyCode(button);
        },

        /**
         * Handle keyboard events (Enter/Space on focused button)
         */
        handleKeydown: function(event) {
            if (event.key !== 'Enter' && event.key !== ' ') return;

            const button = event.target.closest('.copy-code-button');
            if (!button) return;

            event.preventDefault();
            this.copyCode(button);
        },

        /**
         * Copy code to clipboard
         */
        copyCode: async function(button) {
            // Check if Clipboard API is available
            if (!navigator.clipboard) {
                this.showError(button, 'Clipboard not available');
                return;
            }

            let code = '';

            // Check if this is a diagram button (has data-diagram-source attribute)
            if (button.hasAttribute('data-diagram-source')) {
                // Diagram: Get source from data attribute
                code = button.getAttribute('data-diagram-source') || '';
                // Decode HTML entities
                const textarea = document.createElement('textarea');
                textarea.innerHTML = code;
                code = textarea.value;
            } else {
                // Code block: Find the code element
                const wrapper = button.closest('.code-block-wrapper');
                if (!wrapper) return;

                const codeElement = wrapper.querySelector('pre code');
                if (!codeElement) return;

                // Extract code text
                code = this.extractCode(codeElement);
            }

            if (!code) {
                this.showError(button, 'No code to copy');
                return;
            }

            try {
                // Copy to clipboard
                await navigator.clipboard.writeText(code);
                this.showSuccess(button);
            } catch (error) {
                console.error('Failed to copy code:', error);
                this.showError(button, 'Failed to copy');
            }
        },

        /**
         * Extract plain text code from code element
         * Handles HTML entities and preserves whitespace
         */
        extractCode: function(codeElement) {
            // textContent automatically:
            // - Decodes HTML entities (&lt; -> <, &gt; -> >, &amp; -> &)
            // - Strips HTML tags (including syntax highlighting spans)
            // - Preserves whitespace and line breaks
            return codeElement.textContent || '';
        },

        /**
         * Show success feedback
         */
        showSuccess: function(button) {
            const feedback = button.querySelector('.button-feedback');
            if (!feedback) return;

            // Update feedback text
            feedback.textContent = 'Copied!';

            // Add copied class (triggers CSS to show feedback)
            button.classList.add('copied');

            // Reset after 2 seconds
            setTimeout(() => {
                button.classList.remove('copied');
                feedback.textContent = '';
            }, 2000);
        },

        /**
         * Show error feedback
         */
        showError: function(button, message) {
            const feedback = button.querySelector('.button-feedback');
            if (!feedback) return;

            feedback.textContent = message;
            button.classList.add('copied');

            setTimeout(() => {
                button.classList.remove('copied');
                feedback.textContent = '';
            }, 2000);
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => CodeCopyManager.init());
    } else {
        CodeCopyManager.init();
    }
})();
