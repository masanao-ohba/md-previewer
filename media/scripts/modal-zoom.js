// Modal Diagram Zoom functionality
(function initializeModalZoom() {
    const modifierState = {
        ctrlOrMeta: false,
        altKey: false
    };
    // Modal Zoom Manager
    const modalZoomManager = {
        modal: document.getElementById('diagram-modal'),
        modalContent: document.getElementById('modal-content'),
        modalContainer: document.getElementById('modal-diagram-container'),
        modalViewport: document.getElementById('modal-diagram-viewport'),
        modalTitle: document.getElementById('modal-title'),
        isModalOpen: false,
        currentDiagram: null,

        openModal: function(diagramElement) {
            // Clone the diagram element
            const diagramType = diagramElement.getAttribute('data-diagram-type') || 'diagram';
            const diagramContainer = diagramElement.querySelector('.mermaid-container, .plantuml-container') || diagramElement;

            // For Mermaid, find the rendered SVG
            let diagramContent;
            if (diagramType === 'mermaid') {
                const mermaidOutput = diagramElement.querySelector('[id^="mermaid-output-"]');
                diagramContent = mermaidOutput ? mermaidOutput.cloneNode(true) : diagramElement.cloneNode(true);
            } else {
                // For PlantUML, clone the img element
                diagramContent = diagramElement.cloneNode(true);
            }

            // Clear previous content and insert diagram
            this.modalContainer.innerHTML = '';
            this.modalContainer.appendChild(diagramContent);

            // Update modal title
            this.modalTitle.textContent = diagramType.charAt(0).toUpperCase() + diagramType.slice(1) + ' Diagram';

            // Show modal first
            this.modal.classList.add('modal-visible');
            this.isModalOpen = true;
            this.currentDiagram = diagramElement;

            console.log('=== MODAL OPENED ===');
            console.log('Diagram Type:', diagramType);
            console.log('Content:', diagramContent);

            // Initialize display - for PlantUML images, wait for load event
            const imgElement = this.modalContainer.querySelector('img');
            if (imgElement && !imgElement.complete) {
                // PlantUML image not yet loaded - wait for onload event
                imgElement.onload = () => {
                    zoomController.initializeDisplay();
                };
                imgElement.onerror = () => {
                    // Even on error, try to initialize display (will show error message)
                    zoomController.initializeDisplay();
                };
            } else {
                // Image already loaded (cached) or it's SVG - proceed normally
                zoomController.initializeDisplay();
            }

            // Focus management
            document.getElementById('modal-close').focus();
        },

        closeModal: function() {
            // STATELESS ARCHITECTURE: Complete state reset (CLOSED phase)
            // All state must return to initial values for idempotency

            const viewport = this.modalViewport;
            const wrapper = document.getElementById('modal-diagram-wrapper');
            const container = this.modalContainer;

            // Reset viewport scroll
            viewport.scrollLeft = 0;
            viewport.scrollTop = 0;

            // Reset container transform and size
            container.style.transform = 'none';
            container.style.transformOrigin = 'center center';
            container.style.width = '';  // CRITICAL: Reset to allow natural sizing
            container.style.height = ''; // CRITICAL: Reset to allow natural sizing

            // Reset wrapper size
            wrapper.style.width = 'fit-content';
            wrapper.style.height = 'fit-content';
            wrapper.style.minWidth = '';
            wrapper.style.minHeight = '';

            // Reset controller state
            zoomController.currentZoom = 100;
            zoomController.fitRatio = 1.0;
            zoomController.naturalWidth = 0;
            zoomController.naturalHeight = 0;
            zoomController.zoomLevelDisplay.textContent = '100%';

            // Reset modal manager state
            this.isModalOpen = false;
            this.currentDiagram = null;

            // Clean up event listeners
            const imgElement = container.querySelector('img');
            if (imgElement) {
                imgElement.onload = null;
                imgElement.onerror = null;
            }

            // Clear content
            container.innerHTML = '';

            // Hide modal
            this.modal.classList.remove('modal-visible');

            // Reset modifier state/cursor hints
            modifierState.ctrlOrMeta = false;
            modifierState.altKey = false;
            updateViewportCursor();

            console.log('=== MODAL CLOSED (STATE RESET) ===');
            console.log('All state reset to initial values');
        },

        isOpen: function() {
            return this.isModalOpen;
        },

        getState: function() {
            return {
                isOpen: this.isModalOpen,
                diagram: this.currentDiagram,
                zoom: zoomController.getCurrentZoom()
            };
        }
    };

    // Zoom Controller - MEDIUM ZOOM PATTERN (Ultra Simple)
    // True implementation following Medium Zoom's approach
    const zoomController = {
        currentZoom: 100,
        initialZoom: 100,
        fitRatio: 1.0,
        naturalWidth: 0,
        naturalHeight: 0,
        MIN_ZOOM: 10,
        MAX_ZOOM: 1000,
        ZOOM_STEP: 10,
        zoomLevelDisplay: document.getElementById('modal-zoom-level'),

        // STANDARD PATTERN: Initial display with scroll-based centering
        initializeDisplay: function() {
            const viewport = modalZoomManager.modalViewport;
            const wrapper = document.getElementById('modal-diagram-wrapper');
            const container = modalZoomManager.modalContainer;

            if (!wrapper) {
                console.error('Modal wrapper not found');
                return;
            }

            // CRITICAL: Get natural dimensions from first child (actual content)
            // container.offsetWidth can be 0 if display:inline-block without content
            // Use scrollWidth/scrollHeight or first child dimensions as fallback
            let naturalWidth = container.offsetWidth;
            let naturalHeight = container.offsetHeight;

            // Fallback 1: Use scroll dimensions if offset dimensions are 0
            if (naturalWidth === 0) {
                naturalWidth = container.scrollWidth;
            }
            if (naturalHeight === 0) {
                naturalHeight = container.scrollHeight;
            }

            // Fallback 2: Use first child dimensions
            if (naturalWidth === 0 || naturalHeight === 0) {
                const firstChild = container.firstElementChild;
                if (firstChild) {
                    const childRect = firstChild.getBoundingClientRect();
                    naturalWidth = childRect.width || naturalWidth;
                    naturalHeight = childRect.height || naturalHeight;
                }
            }

            // Safety check: minimum dimensions
            if (naturalWidth === 0 || naturalHeight === 0) {
                console.error('Unable to determine content dimensions');
                naturalWidth = Math.max(naturalWidth, 100);
                naturalHeight = Math.max(naturalHeight, 100);
            }

            // FIX: For Mermaid diagrams, use getBBox to exclude internal padding/margin
            // Mermaid SVGs often have large internal padding around actual content
            // This causes the diagram to appear smaller than it should be
            // NOTE: PlantUML diagrams may not support getBBox() reliably, so skip for them
            const svg = container.querySelector('svg');
            const isPlantUML = container.closest('.plantuml-container') !== null;

            if (svg && !isPlantUML) {
                try {
                    const bbox = svg.getBBox();
                    // Only apply if bbox is valid and significantly different from current size
                    if (bbox.width > 0 && bbox.height > 0) {
                        // Add margin to prevent edge clipping (getBBox can be slightly tight)
                        const BBOX_MARGIN = 4;  // Increased from 2px to 4px for better safety
                        const halfMargin = BBOX_MARGIN / 2;

                        // Adjust viewBox: shift start position and expand size to add margin on all sides
                        const viewBoxX = bbox.x - halfMargin;
                        const viewBoxY = bbox.y - halfMargin;
                        const viewBoxWidth = bbox.width + BBOX_MARGIN;
                        const viewBoxHeight = bbox.height + BBOX_MARGIN;
                        const viewBoxValue = viewBoxX + ' ' + viewBoxY + ' ' + viewBoxWidth + ' ' + viewBoxHeight;
                        svg.setAttribute('viewBox', viewBoxValue);

                        // Use expanded size as natural dimensions
                        naturalWidth = viewBoxWidth;
                        naturalHeight = viewBoxHeight;
                        console.log('Applied getBBox correction (Mermaid) - Content size:', {
                            width: bbox.width,
                            height: bbox.height,
                            offset: {x: bbox.x, y: bbox.y}
                        });
                    }
                } catch (e) {
                    console.warn('getBBox() failed, using container dimensions:', e.message);
                    // Fall back to existing dimensions
                }
            } else if (isPlantUML) {
                console.log('PlantUML diagram detected - using container dimensions without getBBox correction');
            }

            // Use full viewport dimensions for consistent calculation
            const viewportWidth = viewport.clientWidth;
            const viewportHeight = viewport.clientHeight;

            // Calculate fit ratio (with small margin for visual comfort)
            const VISUAL_MARGIN = 0.95;  // Use 95% of viewport
            let fitRatio = Math.min(
                (viewportWidth * VISUAL_MARGIN) / naturalWidth,
                (viewportHeight * VISUAL_MARGIN) / naturalHeight
            );

            // CRITICAL: Never enlarge content beyond 100% (fitRatio must be <= 1.0)
            // This prevents unwanted scrollbars at initial 100% display
            // If content is smaller than viewport, keep it at natural size
            fitRatio = Math.min(fitRatio, 1.0);

            // CRITICAL: Store natural dimensions BEFORE scaling
            this.naturalWidth = naturalWidth;
            this.naturalHeight = naturalHeight;
            this.fitRatio = fitRatio;

            // Calculate scaled dimensions
            const scaledWidth = Math.round(naturalWidth * fitRatio);
            const scaledHeight = Math.round(naturalHeight * fitRatio);

            // LAYOUT-ONLY APPROACH: Set container dimensions directly (no transform)
            container.style.width = scaledWidth + 'px';
            container.style.height = scaledHeight + 'px';

            // Reset scroll to origin
            viewport.scrollLeft = 0;
            viewport.scrollTop = 0;

            // CRITICAL: Use centered mode ONLY when content fits in viewport
            // When content is larger, use scrollable mode to prevent left/top edges from being unreachable
            if (scaledWidth <= viewportWidth && scaledHeight <= viewportHeight) {
                viewport.classList.add('centered');
                viewport.classList.remove('scrollable');
            } else {
                viewport.classList.add('scrollable');
                viewport.classList.remove('centered');
            }
            // Update UI
            this.currentZoom = 100;
            this.initialZoom = 100;
            this.zoomLevelDisplay.textContent = '100%';

            updateViewportCursor();

            console.log('=== INITIAL DISPLAY @ 100% (LAYOUT-ONLY) ===');
            console.log('Natural Size:', {width: naturalWidth, height: naturalHeight});
            console.log('FitRatio:', fitRatio);
            console.log('Scaled Size:', {width: scaledWidth, height: scaledHeight});

            // DOM更新後の座標取得
            setTimeout(() => {
                const vpRect = viewport.getBoundingClientRect();
                const ctRect = container.getBoundingClientRect();
                const gap = Math.abs(ctRect.top - vpRect.top);

                console.log('--- Position Check ---');
                console.log('Viewport:', {top: vpRect.top, left: vpRect.left, width: vpRect.width, height: vpRect.height});
                console.log('Container:', {top: ctRect.top, left: ctRect.left, width: ctRect.width, height: ctRect.height});
                console.log('Gap (|container.top - viewport.top|):', gap + 'px');
                console.log('Container Style:', {
                    width: container.style.width,
                    height: container.style.height,
                    transform: getComputedStyle(container).transform
                });
                console.log('Scroll:', {top: viewport.scrollTop, left: viewport.scrollLeft});

                // SVG内部余白診断
                const svg = container.querySelector('svg');
                if (svg) {
                    console.log('--- SVG Internal Structure ---');
                    const viewBox = svg.getAttribute('viewBox');
                    console.log('SVG viewBox:', viewBox || 'not set');
                    console.log('SVG width/height attrs:', {
                        width: svg.getAttribute('width'),
                        height: svg.getAttribute('height')
                    });

                    try {
                        const bbox = svg.getBBox();
                        console.log('SVG getBBox (actual content):', {
                            x: bbox.x,
                            y: bbox.y,
                            width: bbox.width,
                            height: bbox.height
                        });

                        // Calculate padding/margin
                        const svgRect = svg.getBoundingClientRect();
                        const paddingTop = bbox.y;
                        const paddingLeft = bbox.x;
                        const paddingBottom = (viewBox ? parseFloat(viewBox.split(' ')[3]) : svgRect.height) - (bbox.y + bbox.height);
                        const paddingRight = (viewBox ? parseFloat(viewBox.split(' ')[2]) : svgRect.width) - (bbox.x + bbox.width);

                        console.log('SVG Internal Padding:', {
                            top: paddingTop,
                            left: paddingLeft,
                            bottom: paddingBottom,
                            right: paddingRight,
                            total: {
                                vertical: paddingTop + paddingBottom,
                                horizontal: paddingLeft + paddingRight
                            }
                        });

                        // Content ratio
                        const contentRatio = {
                            width: bbox.width / naturalWidth,
                            height: bbox.height / naturalHeight
                        };
                        console.log('Content Ratio (actual content / natural size):', {
                            width: (contentRatio.width * 100).toFixed(1) + '%',
                            height: (contentRatio.height * 100).toFixed(1) + '%'
                        });
                    } catch (e) {
                        console.warn('getBBox() failed:', e.message);
                    }
                }
            }, 0);
        },

        changeZoom: function(newPercentage, options = {}) {
            const oldZoom = this.currentZoom;
            const newZoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, newPercentage));

            if (oldZoom === newZoom) return;

            const viewport = modalZoomManager.modalViewport;
            const wrapper = document.getElementById('modal-diagram-wrapper');
            const container = modalZoomManager.modalContainer;

            if (!wrapper) {
                console.error('Modal wrapper not found');
                return;
            }

            // Use stored natural dimensions (NOT container.offsetWidth which returns scaled size)
            const naturalWidth = this.naturalWidth;
            const naturalHeight = this.naturalHeight;

            if (naturalWidth === 0 || naturalHeight === 0) {
                console.error('Unable to determine content dimensions for zoom - natural size not initialized');
                return;
            }

            const oldScale = this.fitRatio * (oldZoom / 100);
            const newScale = this.fitRatio * (newZoom / 100);

            const offsets = getContainerOffsets(viewport, container);
            const defaultAnchorX = viewport.clientWidth / 2 + viewport.scrollLeft - offsets.horizontalOffset;
            const defaultAnchorY = viewport.clientHeight / 2 + viewport.scrollTop - offsets.verticalOffset;
            const anchorX = typeof options.anchorX === 'number' ? options.anchorX : defaultAnchorX;
            const anchorY = typeof options.anchorY === 'number' ? options.anchorY : defaultAnchorY;

            console.log('=== ZOOM CHANGE: ' + oldZoom + '% → ' + newZoom + '% ===');

            // BEFORE
            const ctRectBefore = container.getBoundingClientRect();
            console.log('BEFORE:', {
                containerTop: ctRectBefore.top,
                containerLeft: ctRectBefore.left,
                scrollTop: viewport.scrollTop,
                scrollLeft: viewport.scrollLeft
            });

            // Detect previous container size (before dimension change)
            const oldWidth = parseInt(container.style.width) || 0;
            const oldHeight = parseInt(container.style.height) || 0;
            const hadHorizontalScroll = oldWidth > viewport.clientWidth;
            const hadVerticalScroll = oldHeight > viewport.clientHeight;

            // LAYOUT-ONLY APPROACH: Set container dimensions directly (no transform)
            const newWidth = Math.round(naturalWidth * newScale);
            const newHeight = Math.round(naturalHeight * newScale);
            container.style.width = newWidth + 'px';
            container.style.height = newHeight + 'px';

            // Detect mode transition independently for horizontal and vertical
            const willHaveHorizontalScroll = newWidth > viewport.clientWidth;
            const willHaveVerticalScroll = newHeight > viewport.clientHeight;
            const horizontalTransition = !hadHorizontalScroll && willHaveHorizontalScroll;
            const verticalTransition = !hadVerticalScroll && willHaveVerticalScroll;

            console.log('Mode detection:', {
                oldSize: {width: oldWidth, height: oldHeight},
                newSize: {width: newWidth, height: newHeight},
                viewport: {width: viewport.clientWidth, height: viewport.clientHeight},
                hadScroll: {h: hadHorizontalScroll, v: hadVerticalScroll},
                willScroll: {h: willHaveHorizontalScroll, v: willHaveVerticalScroll},
                transition: {h: horizontalTransition, v: verticalTransition}
            });

            // CRITICAL: Switch between centered/scrollable mode based on content size
            // This prevents left/top edges from being unreachable when zoomed
            if (newWidth <= viewport.clientWidth && newHeight <= viewport.clientHeight) {
                viewport.classList.add('centered');
                viewport.classList.remove('scrollable');
            } else {
                viewport.classList.add('scrollable');
                viewport.classList.remove('centered');
            }

            // Adjust scroll position independently for horizontal and vertical
            const ratio = newScale / oldScale;

            // Calculate anchor-fixed zoom scroll positions
            let newScrollLeft = anchorX * ratio - viewport.clientWidth / 2;
            let newScrollTop = anchorY * ratio - viewport.clientHeight / 2;

            // Apply scroll positions with clamping to valid range
            if (willHaveHorizontalScroll) {
                // Clamp to [0, maxScrollLeft] to prevent negative scroll or overflow
                const maxScrollLeft = newWidth - viewport.clientWidth;
                viewport.scrollLeft = Math.max(0, Math.min(newScrollLeft, maxScrollLeft));
                if (horizontalTransition) {
                    console.log('Horizontal scroll transition: center-fixed with clamp', {
                        calculated: newScrollLeft,
                        clamped: viewport.scrollLeft
                    });
                }
            } else {
                // No horizontal scroll needed
                viewport.scrollLeft = 0;
            }

            if (willHaveVerticalScroll) {
                // Clamp to [0, maxScrollTop] to prevent negative scroll or overflow
                const maxScrollTop = newHeight - viewport.clientHeight;
                viewport.scrollTop = Math.max(0, Math.min(newScrollTop, maxScrollTop));
                if (verticalTransition) {
                    console.log('Vertical scroll transition: center-fixed with clamp', {
                        calculated: newScrollTop,
                        clamped: viewport.scrollTop
                    });
                }
            } else {
                // No vertical scroll needed
                viewport.scrollTop = 0;
            }

            this.currentZoom = newZoom;
            this.zoomLevelDisplay.textContent = newZoom + '%';

            updateViewportCursor();

            // AFTER
            setTimeout(() => {
                const vpRect = viewport.getBoundingClientRect();
                const ctRectAfter = container.getBoundingClientRect();

                console.log('AFTER:', {
                    containerTop: ctRectAfter.top,
                    containerLeft: ctRectAfter.left,
                    scrollTop: viewport.scrollTop,
                    scrollLeft: viewport.scrollLeft
                });

                console.log('Delta:', {
                    top: ctRectAfter.top - ctRectBefore.top,
                    left: ctRectAfter.left - ctRectBefore.left
                });

                console.log('Transform:', getComputedStyle(container).transform);

                const gap = Math.abs(ctRectAfter.top - vpRect.top);
                console.log('Gap:', gap + 'px');

                // DIAGNOSTIC: Container size after zoom
                console.log('--- Zoom Diagnostic ---');
                console.log('Container size (style):', {
                    width: container.style.width,
                    height: container.style.height
                });
                console.log('Container size (computed):', {
                    width: ctRectAfter.width + 'px',
                    height: ctRectAfter.height + 'px'
                });

                // DIAGNOSTIC: SVG size
                const svg = container.querySelector('svg');
                if (svg) {
                    const svgRect = svg.getBoundingClientRect();
                    const svgComputed = getComputedStyle(svg);
                    console.log('SVG size:', {
                        width: svgRect.width + 'px',
                        height: svgRect.height + 'px',
                        computedWidth: svgComputed.width,
                        computedHeight: svgComputed.height
                    });
                }
            }, 0);
        },

        zoomIn: function() {
            this.changeZoom(this.currentZoom + this.ZOOM_STEP);
        },

        zoomOut: function() {
            this.changeZoom(this.currentZoom - this.ZOOM_STEP);
        },

        reset: function() {
            // Return to initial READY state (idempotent)
            this.initializeDisplay();
        },

        getCurrentZoom: function() {
            return this.currentZoom;
        }
    };

    // Pan Controller
    const panController = {
        isPanning: false,
        startX: 0,
        startY: 0,
        scrollLeft: 0,
        scrollTop: 0,

        startDrag: function(event) {
            if (event.button !== 0) return;
            if (zoomController.currentZoom <= 100) return;
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            const viewport = modalZoomManager.modalViewport;
            event.preventDefault();
            this.isPanning = true;
            this.startX = event.pageX - viewport.offsetLeft;
            this.startY = event.pageY - viewport.offsetTop;
            this.scrollLeft = viewport.scrollLeft;
            this.scrollTop = viewport.scrollTop;

            updateViewportCursor();
        },

        drag: function(event) {
            if (!this.isPanning) return;
            event.preventDefault();
            const viewport = modalZoomManager.modalViewport;
            const x = event.pageX - viewport.offsetLeft;
            const y = event.pageY - viewport.offsetTop;
            const walkX = (x - this.startX) * 2;
            const walkY = (y - this.startY) * 2;
            viewport.scrollLeft = this.scrollLeft - walkX;
            viewport.scrollTop = this.scrollTop - walkY;
        },

        endDrag: function() {
            if (!this.isPanning) return;
            this.isPanning = false;
            updateViewportCursor();
        },

        getPosition: function() {
            const viewport = modalZoomManager.modalViewport;
            return {
                scrollLeft: viewport.scrollLeft,
                scrollTop: viewport.scrollTop
            };
        }
    };

    function updateViewportCursor() {
        const viewport = modalZoomManager.modalViewport;
        if (!viewport) return;

        viewport.classList.remove('zoom-in-mode', 'zoom-out-mode', 'pan-ready', 'pan-dragging');

        if (!modalZoomManager.isOpen()) return;

        if (modifierState.ctrlOrMeta) {
            viewport.classList.add('zoom-in-mode');
            return;
        }

        if (modifierState.altKey) {
            viewport.classList.add('zoom-out-mode');
            return;
        }

        if (panController.isPanning) {
            viewport.classList.add('pan-dragging');
            return;
        }

        if (zoomController.currentZoom > 100) {
            viewport.classList.add('pan-ready');
        }
    }

    function syncModifierStateFromEvent(event) {
        const nextCtrlOrMeta = event.ctrlKey || event.metaKey;
        const nextAlt = event.altKey;
        if (modifierState.ctrlOrMeta === nextCtrlOrMeta && modifierState.altKey === nextAlt) {
            return;
        }
        modifierState.ctrlOrMeta = nextCtrlOrMeta;
        modifierState.altKey = nextAlt;
        updateViewportCursor();
    }

    function getContainerAnchorFromEvent(event) {
        const viewport = modalZoomManager.modalViewport;
        const container = modalZoomManager.modalContainer;
        if (!container || !viewport) {
            return { anchorX: 0, anchorY: 0 };
        }

        const viewportRect = viewport.getBoundingClientRect();
        const clickX = event.clientX - viewportRect.left;
        const clickY = event.clientY - viewportRect.top;
        const offsets = getContainerOffsets(viewport, container);

        const rawAnchorX = clickX + viewport.scrollLeft - offsets.horizontalOffset;
        const rawAnchorY = clickY + viewport.scrollTop - offsets.verticalOffset;
        const anchorX = Math.min(container.offsetWidth, Math.max(0, rawAnchorX));
        const anchorY = Math.min(container.offsetHeight, Math.max(0, rawAnchorY));
        return { anchorX, anchorY };
    }

    function getContainerOffsets(viewport, container) {
        if (!viewport || !container) {
            return { horizontalOffset: 0, verticalOffset: 0 };
        }

        if (!viewport.classList.contains('centered')) {
            return { horizontalOffset: 0, verticalOffset: 0 };
        }

        return {
            horizontalOffset: Math.max(0, (viewport.clientWidth - container.offsetWidth) / 2),
            verticalOffset: Math.max(0, (viewport.clientHeight - container.offsetHeight) / 2)
        };
    }

    // Expose to window for testing
    window.modalZoomManager = modalZoomManager;
    window.zoomController = zoomController;

    // Event Listeners

    // Click handler for diagrams
    document.addEventListener('click', (e) => {
        const diagramElement = e.target.closest('.diagram-clickable');
        if (diagramElement) {
            e.preventDefault();
            modalZoomManager.openModal(diagramElement);
        }
    });

    // Modal close button
    document.getElementById('modal-close').addEventListener('click', () => {
        modalZoomManager.closeModal();
    });

    // Backdrop click to close
    modalZoomManager.modal.addEventListener('click', (e) => {
        if (e.target === modalZoomManager.modal) {
            modalZoomManager.closeModal();
        }
    });

    // Prevent closing when clicking modal content
    modalZoomManager.modalContent.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // ESC key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalZoomManager.isOpen()) {
            modalZoomManager.closeModal();
        }

        // Only handle zoom shortcuts when modal is open
        if (!modalZoomManager.isOpen()) return;

        syncModifierStateFromEvent(e);

        // Ctrl/Cmd + Plus
        if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
            e.preventDefault();
            zoomController.zoomIn();
        }
        // Ctrl/Cmd + Minus
        if ((e.ctrlKey || e.metaKey) && e.key === '-') {
            e.preventDefault();
            zoomController.zoomOut();
        }
        // Ctrl/Cmd + 0
        if ((e.ctrlKey || e.metaKey) && e.key === '0') {
            e.preventDefault();
            zoomController.reset();
        }
    });

    document.addEventListener('keyup', (e) => {
        if (!modalZoomManager.isOpen()) return;
        syncModifierStateFromEvent(e);
    });

    // Zoom controls
    document.getElementById('modal-zoom-in').addEventListener('click', () => {
        zoomController.zoomIn();
    });

    document.getElementById('modal-zoom-out').addEventListener('click', () => {
        zoomController.zoomOut();
    });

    document.getElementById('modal-zoom-reset').addEventListener('click', () => {
        zoomController.reset();
    });

    // Pan/drag support
    const viewport = modalZoomManager.modalViewport;

    viewport.addEventListener('click', (e) => {
        if (!modalZoomManager.isOpen()) return;
        if (e.button !== 0) return;

        if ((e.ctrlKey || e.metaKey) && !e.altKey) {
            e.preventDefault();
            e.stopPropagation();
            const { anchorX, anchorY } = getContainerAnchorFromEvent(e);
            zoomController.changeZoom(zoomController.currentZoom + zoomController.ZOOM_STEP, { anchorX, anchorY });
            return;
        }

        if (e.altKey && !(e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            e.stopPropagation();
            const { anchorX, anchorY } = getContainerAnchorFromEvent(e);
            zoomController.changeZoom(zoomController.currentZoom - zoomController.ZOOM_STEP, { anchorX, anchorY });
        }
    });

    viewport.addEventListener('mousedown', (e) => {
        panController.startDrag(e);
    });

    viewport.addEventListener('mouseleave', () => {
        panController.endDrag();
    });

    viewport.addEventListener('mouseup', () => {
        panController.endDrag();
    });

    viewport.addEventListener('mousemove', (e) => {
        panController.drag(e);
    });
})();
