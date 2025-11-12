#!/usr/bin/env node

/**
 * E2E Test for Modal Diagram Zoom Behavior (JSDOM-based)
 * Verifies zoom operations preserve viewport center and reset functionality
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Test tolerance for coordinate comparisons (pixels)
const TOLERANCE = 5;

// Mock vscode module
const vscodeModule = {
  workspace: {
    getConfiguration: () => ({
      get: (key, defaultValue) => {
        if (key === 'preview.theme') return 'github-light';
        if (key === 'preview.debounceDelay') return 300;
        return defaultValue;
      }
    })
  },
  ViewColumn: { One: 1, Two: 2, Three: 3 },
  Uri: {
    file: (p) => ({ fsPath: p }),
    parse: (p) => ({ fsPath: p })
  },
  window: {
    createWebviewPanel: () => ({
      webview: { html: '', onDidDispose: () => {} },
      onDidDispose: () => {},
      reveal: () => {}
    })
  }
};

// Mock module loading
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id === 'vscode') {
    return vscodeModule;
  }
  return originalRequire.apply(this, arguments);
};

/**
 * Generate webview HTML with test content
 */
function generateWebviewHTML() {
  try {
    // Clear module cache
    delete require.cache[require.resolve('../../out/preview/PreviewPanel.js')];
    delete require.cache[require.resolve('../../out/themes/ThemeManager.js')];

    const { PreviewPanel } = require('../../out/preview/PreviewPanel.js');

    // Create mock context
    const mockContext = {
      extensionPath: path.join(__dirname, '../..'),
      extensionUri: { fsPath: path.join(__dirname, '../..') },
      subscriptions: []
    };

    // Generate HTML with test Mermaid diagram
    const testContent = `
# Test Markdown File

## Mermaid Diagram

\`\`\`mermaid
graph TD
  A[Start] --> B[Process 1]
  B --> C[Process 2]
  C --> D[End]
\`\`\`

## PlantUML Diagram

\`\`\`plantuml
@startuml
Alice -> Bob: Authentication Request
Bob --> Alice: Authentication Response
@enduml
\`\`\`
    `;

    const mockDocument = {
      fileName: 'test.md',
      getText: () => testContent
    };

    // Create mock panel object
    const mockPanel = {
      webview: {
        html: '',
        onDidReceiveMessage: () => ({ dispose: () => {} })
      },
      onDidDispose: () => ({ dispose: () => {} }),
      reveal: () => {}
    };

    // Create PreviewPanel instance
    const previewPanel = new PreviewPanel(mockPanel, mockContext, mockDocument);

    // Call the private method to get HTML
    const html = previewPanel['getWebviewHtml'](testContent, mockDocument);

    return html;

  } catch (error) {
    console.error('Failed to generate HTML:', error.message);
    throw error;
  }
}

/**
 * Capture modal state from DOM
 */
function captureState(document) {
  const viewport = document.getElementById('modal-diagram-viewport');
  const container = document.getElementById('modal-diagram-container');
  const zoomLevel = document.getElementById('modal-zoom-level');

  if (!viewport || !container || !zoomLevel) {
    throw new Error(`Modal elements not found: viewport=${!!viewport}, container=${!!container}, zoomLevel=${!!zoomLevel}`);
  }

  const computedStyle = window.getComputedStyle(container);

  return {
    viewport: {
      clientWidth: viewport.clientWidth,
      clientHeight: viewport.clientHeight,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop
    },
    diagram: {
      offsetLeft: container.offsetLeft,
      offsetTop: container.offsetTop,
      offsetWidth: container.offsetWidth,
      offsetHeight: container.offsetHeight
    },
    style: {
      transform: computedStyle.transform,
      transformOrigin: computedStyle.transformOrigin
    },
    zoom: parseInt(zoomLevel.textContent.replace('%', '') || '100')
  };
}

/**
 * Calculate viewport center point
 */
function calculateViewportCenter(state) {
  return {
    x: state.viewport.scrollLeft + state.viewport.clientWidth / 2,
    y: state.viewport.scrollTop + state.viewport.clientHeight / 2
  };
}

/**
 * Calculate diagram center point
 */
function calculateDiagramCenter(state) {
  return {
    x: state.diagram.offsetLeft + state.diagram.offsetWidth / 2,
    y: state.diagram.offsetTop + state.diagram.offsetHeight / 2
  };
}

/**
 * Calculate drift between two points
 */
function calculateDrift(before, after) {
  return {
    x: Math.abs(after.x - before.x),
    y: Math.abs(after.y - before.y)
  };
}

/**
 * Log minimal diagnostic information for debugging failures
 */
function logDiagnostics(before, after, operation) {
  const centerBefore = calculateViewportCenter(before);
  const centerAfter = calculateViewportCenter(after);
  const drift = calculateDrift(centerBefore, centerAfter);

  console.log(`\n❌ TEST FAILED: ${operation}`);
  console.log(`Zoom: ${before.zoom}% → ${after.zoom}%`);
  console.log(`Center drift: X=${drift.x.toFixed(2)}px, Y=${drift.y.toFixed(2)}px (tolerance: ${TOLERANCE}px)\n`);
}

/**
 * Assert function with detailed error message
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(`❌ ASSERTION FAILED: ${message}`);
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🧪 Modal Diagram Zoom E2E Test (JSDOM)\n');
  console.log('='.repeat(80));

  let testsPassed = 0;
  let testsFailed = 0;
  const failureMessages = [];

  try {
    // Step 1: Generate HTML
    console.log('📄 Step 1: Generating webview HTML...');
    const html = generateWebviewHTML();
    console.log(`✅ Generated HTML (${html.length} characters)\n`);

    // Step 2: Create DOM
    console.log('🌐 Step 2: Creating JSDOM environment...');
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      resources: 'usable',
      pretendToBeVisual: true
    });
    const { window } = dom;
    const { document } = window;
    global.window = window;
    global.document = document;
    console.log('✅ DOM created\n');

    // Step 3: Wait for scripts to initialize
    console.log('⏳ Step 3: Waiting for scripts to initialize...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ Initialization complete\n');

    // Step 4: Inject test diagram content into preview
    console.log('📝 Step 4: Injecting test diagram...');
    const previewContainer = document.getElementById('preview-container');
    if (!previewContainer) {
      throw new Error('Preview container not found in generated HTML');
    }

    // Inject Mermaid diagram
    previewContainer.innerHTML = `
      <div class="diagram-clickable mermaid-container" data-diagram-type="mermaid">
        <div id="mermaid-output-0">
          <svg width="600" height="400" viewBox="0 0 600 400">
            <rect width="600" height="400" fill="#f0f0f0"/>
            <text x="300" y="200" text-anchor="middle" font-size="20">Mermaid Diagram</text>
          </svg>
        </div>
      </div>
    `;
    console.log('✅ Test diagram injected\n');

    // Step 5: Simulate diagram click to open modal
    console.log('🖱️  Step 5: Simulating diagram click to open modal...');
    const diagram = document.querySelector('.diagram-clickable');
    if (!diagram) {
      throw new Error('Diagram element not found');
    }

    // Manually create and dispatch click event
    const clickEvent = new window.Event('click', { bubbles: true });
    diagram.dispatchEvent(clickEvent);

    // Wait for modal to open
    await new Promise(resolve => setTimeout(resolve, 500));

    const modal = document.getElementById('diagram-modal');
    if (!modal || !modal.classList.contains('modal-visible')) {
      throw new Error('Modal did not open after diagram click');
    }
    console.log('✅ Modal opened successfully\n');

    // ========================================================================
    // TEST 1: Initial centering
    // ========================================================================
    console.log('TEST 1: Initial display - Diagram centered with margin');
    console.log('-'.repeat(80));

    try {
      const initialState = captureState(document);
      const viewportCenter = calculateViewportCenter(initialState);
      const diagramCenter = calculateDiagramCenter(initialState);
      const deltaX = Math.abs(diagramCenter.x - viewportCenter.x);
      const deltaY = Math.abs(diagramCenter.y - viewportCenter.y);

      console.log(`Viewport center: (${viewportCenter.x.toFixed(2)}, ${viewportCenter.y.toFixed(2)})`);
      console.log(`Diagram center: (${diagramCenter.x.toFixed(2)}, ${diagramCenter.y.toFixed(2)})`);
      console.log(`Delta X: ${deltaX.toFixed(2)}px (tolerance: ${TOLERANCE}px)`);
      console.log(`Delta Y: ${deltaY.toFixed(2)}px (tolerance: ${TOLERANCE}px)`);
      console.log(`Initial zoom: ${initialState.zoom}%`);

      assert(deltaX <= TOLERANCE,
        `Diagram not horizontally centered: Delta X ${deltaX.toFixed(2)}px > tolerance ${TOLERANCE}px`
      );
      assert(deltaY <= TOLERANCE,
        `Diagram not vertically centered: Delta Y ${deltaY.toFixed(2)}px > tolerance ${TOLERANCE}px`
      );
      assert(initialState.zoom === 100,
        `Initial zoom not 100%: ${initialState.zoom}%`
      );

      console.log('✅ TEST 1 PASSED\n');
      testsPassed++;

    } catch (error) {
      console.log(`❌ TEST 1 FAILED: ${error.message}\n`);
      testsFailed++;
      failureMessages.push(`TEST 1: ${error.message}`);
    }

    // ========================================================================
    // TEST 2: Zoom in - Center preservation
    // ========================================================================
    console.log('TEST 2: Zoom in - Point at viewport center stays at viewport center');
    console.log('-'.repeat(80));

    try {
      const stateBefore = captureState(document);
      const centerBefore = calculateViewportCenter(stateBefore);

      // Simulate zoom in click
      const zoomInButton = document.getElementById('modal-zoom-in');
      if (!zoomInButton) {
        throw new Error('Zoom in button not found');
      }

      const zoomClickEvent = new window.Event('click', { bubbles: true });
      zoomInButton.dispatchEvent(zoomClickEvent);

      // Wait for zoom operation
      await new Promise(resolve => setTimeout(resolve, 200));

      const stateAfter = captureState(document);
      const centerAfter = calculateViewportCenter(stateAfter);
      const drift = calculateDrift(centerBefore, centerAfter);

      console.log(`Center before: (${centerBefore.x.toFixed(2)}, ${centerBefore.y.toFixed(2)})`);
      console.log(`Center after: (${centerAfter.x.toFixed(2)}, ${centerAfter.y.toFixed(2)})`);
      console.log(`Drift X: ${drift.x.toFixed(2)}px (tolerance: ${TOLERANCE}px)`);
      console.log(`Drift Y: ${drift.y.toFixed(2)}px (tolerance: ${TOLERANCE}px)`);
      console.log(`Zoom: ${stateBefore.zoom}% → ${stateAfter.zoom}%`);

      assert(drift.x <= TOLERANCE,
        `Zoom in did NOT preserve viewport center X: Drift ${drift.x.toFixed(2)}px > tolerance ${TOLERANCE}px`
      );
      assert(drift.y <= TOLERANCE,
        `Zoom in did NOT preserve viewport center Y: Drift ${drift.y.toFixed(2)}px > tolerance ${TOLERANCE}px`
      );
      assert(stateAfter.zoom === 110,
        `Zoom level not increased to 110%: ${stateAfter.zoom}%`
      );

      console.log('✅ TEST 2 PASSED\n');
      testsPassed++;

    } catch (error) {
      console.log(`❌ TEST 2 FAILED: ${error.message}\n`);
      const stateBefore = captureState(document);
      const stateAfter = captureState(document);
      logDiagnostics(stateBefore, stateAfter, 'Zoom In Test Failure');
      testsFailed++;
      failureMessages.push(`TEST 2: ${error.message}`);
    }

    // ========================================================================
    // TEST 3: Zoom out to 100% - Position restoration
    // ========================================================================
    console.log('TEST 3: Zoom out to 100% - Returns to initial position');
    console.log('-'.repeat(80));

    try {
      // Capture initial state (should be at 110% from previous test)
      const beforeMultiZoom = captureState(document);
      const initialDiagramCenter = calculateDiagramCenter(beforeMultiZoom);

      // Zoom in one more time
      const zoomInButton = document.getElementById('modal-zoom-in');
      zoomInButton.dispatchEvent(new window.Event('click', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify we're at 120%
      const at120 = captureState(document);
      console.log(`After zoom in: ${at120.zoom}%`);

      // Zoom out twice to return to 100%
      const zoomOutButton = document.getElementById('modal-zoom-out');
      zoomOutButton.dispatchEvent(new window.Event('click', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 200));

      zoomOutButton.dispatchEvent(new window.Event('click', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 200));

      const finalState = captureState(document);
      const finalDiagramCenter = calculateDiagramCenter(finalState);
      const finalViewportCenter = calculateViewportCenter(finalState);

      const positionDelta = calculateDrift(initialDiagramCenter, finalDiagramCenter);
      const centeringDelta = calculateDrift(finalDiagramCenter, finalViewportCenter);

      console.log(`Initial diagram center: (${initialDiagramCenter.x.toFixed(2)}, ${initialDiagramCenter.y.toFixed(2)})`);
      console.log(`Final diagram center: (${finalDiagramCenter.x.toFixed(2)}, ${finalDiagramCenter.y.toFixed(2)})`);
      console.log(`Position delta X: ${positionDelta.x.toFixed(2)}px (tolerance: ${TOLERANCE}px)`);
      console.log(`Position delta Y: ${positionDelta.y.toFixed(2)}px (tolerance: ${TOLERANCE}px)`);
      console.log(`Centering delta X: ${centeringDelta.x.toFixed(2)}px`);
      console.log(`Centering delta Y: ${centeringDelta.y.toFixed(2)}px`);
      console.log(`Final zoom: ${finalState.zoom}%`);

      assert(finalState.zoom === 100,
        `Zoom not returned to 100%: ${finalState.zoom}%`
      );
      assert(positionDelta.x <= TOLERANCE,
        `Diagram did NOT return to initial X position: Delta ${positionDelta.x.toFixed(2)}px > tolerance ${TOLERANCE}px`
      );
      assert(positionDelta.y <= TOLERANCE,
        `Diagram did NOT return to initial Y position: Delta ${positionDelta.y.toFixed(2)}px > tolerance ${TOLERANCE}px`
      );
      assert(centeringDelta.x <= TOLERANCE,
        `Diagram not re-centered horizontally: Delta ${centeringDelta.x.toFixed(2)}px > tolerance ${TOLERANCE}px`
      );
      assert(centeringDelta.y <= TOLERANCE,
        `Diagram not re-centered vertically: Delta ${centeringDelta.y.toFixed(2)}px > tolerance ${TOLERANCE}px`
      );

      console.log('✅ TEST 3 PASSED\n');
      testsPassed++;

    } catch (error) {
      console.log(`❌ TEST 3 FAILED: ${error.message}\n`);
      testsFailed++;
      failureMessages.push(`TEST 3: ${error.message}`);
    }

    // ========================================================================
    // TEST 4: Reset button - Return to initial state
    // ========================================================================
    console.log('TEST 4: Reset button - Returns to initial state');
    console.log('-'.repeat(80));

    try {
      // Zoom in multiple times
      const zoomInButton = document.getElementById('modal-zoom-in');
      for (let i = 0; i < 3; i++) {
        zoomInButton.dispatchEvent(new window.Event('click', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      const beforeReset = captureState(document);
      console.log(`Before reset: Zoom ${beforeReset.zoom}%`);

      // Click reset button
      const resetButton = document.getElementById('modal-zoom-reset');
      if (!resetButton) {
        throw new Error('Reset button not found');
      }

      resetButton.dispatchEvent(new window.Event('click', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 200));

      const afterReset = captureState(document);
      const resetDiagramCenter = calculateDiagramCenter(afterReset);
      const resetViewportCenter = calculateViewportCenter(afterReset);
      const centeringDelta = calculateDrift(resetDiagramCenter, resetViewportCenter);

      console.log(`After reset: Zoom ${afterReset.zoom}%`);
      console.log(`Diagram center: (${resetDiagramCenter.x.toFixed(2)}, ${resetDiagramCenter.y.toFixed(2)})`);
      console.log(`Viewport center: (${resetViewportCenter.x.toFixed(2)}, ${resetViewportCenter.y.toFixed(2)})`);
      console.log(`Centering delta X: ${centeringDelta.x.toFixed(2)}px (tolerance: ${TOLERANCE}px)`);
      console.log(`Centering delta Y: ${centeringDelta.y.toFixed(2)}px (tolerance: ${TOLERANCE}px)`);
      console.log(`Viewport scroll: (${afterReset.viewport.scrollLeft}, ${afterReset.viewport.scrollTop})`);

      assert(afterReset.zoom === 100,
        `Reset did not return zoom to 100%: ${afterReset.zoom}%`
      );
      assert(centeringDelta.x <= TOLERANCE,
        `Diagram not centered horizontally after reset: Delta ${centeringDelta.x.toFixed(2)}px > tolerance ${TOLERANCE}px`
      );
      assert(centeringDelta.y <= TOLERANCE,
        `Diagram not centered vertically after reset: Delta ${centeringDelta.y.toFixed(2)}px > tolerance ${TOLERANCE}px`
      );
      assert(afterReset.viewport.scrollLeft === 0,
        `Viewport scrollLeft not reset: ${afterReset.viewport.scrollLeft}`
      );
      assert(afterReset.viewport.scrollTop === 0,
        `Viewport scrollTop not reset: ${afterReset.viewport.scrollTop}`
      );

      console.log('✅ TEST 4 PASSED\n');
      testsPassed++;

    } catch (error) {
      console.log(`❌ TEST 4 FAILED: ${error.message}\n`);
      testsFailed++;
      failureMessages.push(`TEST 4: ${error.message}`);
    }

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total tests: ${testsPassed + testsFailed}`);
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log('='.repeat(80));

    if (testsFailed > 0) {
      console.log('\nFAILURE DETAILS:');
      failureMessages.forEach((msg, idx) => {
        console.log(`${idx + 1}. ${msg}`);
      });
      console.log('\n❌ OVERALL RESULT: FAILED\n');
      process.exit(1);
    } else {
      console.log('\n✅ OVERALL RESULT: ALL TESTS PASSED\n');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ TEST EXECUTION ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
