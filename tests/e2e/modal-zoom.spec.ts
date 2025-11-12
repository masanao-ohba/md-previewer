/**
 * E2E Tests for Modal Diagram Zoom
 *
 * Verifies zoom operations preserve viewport center and reset functionality.
 *
 * Requirements tested:
 * 1. Initial display: Diagram centered with margin
 * 2. Zoom in: Point at viewport center stays at viewport center
 * 3. Zoom out to 100%: Returns to initial position
 * 4. Reset button: Returns to initial state
 *
 * Coverage:
 * - Mermaid diagrams
 * - PlantUML diagrams
 */

import { test, expect, Page } from '@playwright/test';
import {
  captureState,
  calculateViewportCenter,
  calculateDiagramCenter,
  calculateCenterDrift,
  openModal,
  closeModal,
  logDiagnostics,
  SELECTORS,
  TOLERANCE,
  ModalState,
  Point
} from './helpers/zoom-helpers';

// Test both Mermaid and PlantUML diagrams
const DIAGRAM_TYPES = [
  { name: 'Mermaid', selector: SELECTORS.mermaidDiagram },
  { name: 'PlantUML', selector: SELECTORS.plantumlDiagram }
];

for (const diagram of DIAGRAM_TYPES) {
  test.describe(`Modal Diagram Zoom - ${diagram.name} Diagrams`, () => {

    test.beforeEach(async ({ page }) => {
      // Skip if not in VSCode extension test environment
      test.skip(!process.env.VSCODE_TEST_RUNNING, 'Requires VSCode extension test environment');
    });

    /**
     * Scenario 1: Initial Modal Display - Center Alignment
     *
     * Requirement: When user clicks a diagram, the modal opens and displays
     * the diagram centered within the viewport with automatic fit-to-viewport sizing.
     */
    test('Initial display: Diagram centered with margin', async ({ page }) => {
      // Arrange & Act: Open modal
      await openModal(page, diagram.selector);

      // Capture initial state
      const initialState = await captureState(page);

      // Calculate centers
      const viewportCenter = calculateViewportCenter(initialState);
      const diagramCenter = calculateDiagramCenter(initialState);

      // Calculate deltas
      const deltaX = Math.abs(diagramCenter.x - viewportCenter.x);
      const deltaY = Math.abs(diagramCenter.y - viewportCenter.y);

      // Assert: Diagram center should match viewport center within tolerance
      try {
        expect(deltaX,
          `Diagram not horizontally centered:\n` +
          `  Viewport center X: ${viewportCenter.x.toFixed(2)}\n` +
          `  Diagram center X: ${diagramCenter.x.toFixed(2)}\n` +
          `  Delta: ${deltaX.toFixed(2)}px\n` +
          `  Tolerance: ${TOLERANCE}px`
        ).toBeLessThanOrEqual(TOLERANCE);

        expect(deltaY,
          `Diagram not vertically centered:\n` +
          `  Viewport center Y: ${viewportCenter.y.toFixed(2)}\n` +
          `  Diagram center Y: ${diagramCenter.y.toFixed(2)}\n` +
          `  Delta: ${deltaY.toFixed(2)}px\n` +
          `  Tolerance: ${TOLERANCE}px`
        ).toBeLessThanOrEqual(TOLERANCE);

        // Verify initial zoom is 100%
        const zoomText = await page.textContent(SELECTORS.zoomLevel);
        expect(zoomText).toBe('100%');

      } catch (error) {
        logDiagnostics(initialState, initialState, 'Initial Display');
        throw error;
      }
    });

    /**
     * Scenario 2: Zoom In - Viewport Center Preservation
     *
     * Requirement: When user clicks zoom in, the point that was at the viewport center
     * before zoom should remain at the viewport center after zoom. This ensures smooth,
     * predictable zoom behavior focused on the currently visible content.
     */
    test('Zoom in: Point at viewport center stays at viewport center', async ({ page }) => {
      // Arrange: Open modal
      await openModal(page, diagram.selector);

      // Capture state BEFORE zoom
      const stateBefore = await captureState(page);
      const centerBefore = calculateViewportCenter(stateBefore);

      // Act: Click zoom in button
      await page.click(SELECTORS.zoomIn);
      // Wait for zoom operation to complete
      await page.waitForTimeout(100);

      // Capture state AFTER zoom
      const stateAfter = await captureState(page);
      const centerAfter = calculateViewportCenter(stateAfter);

      // Calculate drift
      const drift = calculateCenterDrift(centerBefore, centerAfter);

      // Assert: Viewport center should be unchanged
      try {
        expect(drift.x,
          `Zoom in did NOT preserve viewport center X:\n` +
          `  Before zoom: ${centerBefore.x.toFixed(2)}\n` +
          `  After zoom: ${centerAfter.x.toFixed(2)}\n` +
          `  Delta: ${drift.x.toFixed(2)}px (exceeds tolerance of ${TOLERANCE}px)\n\n` +
          `Likely cause: Incorrect transform-origin calculation\n` +
          `Check: PreviewPanel.ts lines 716-743 (transform-origin setting)`
        ).toBeLessThanOrEqual(TOLERANCE);

        expect(drift.y,
          `Zoom in did NOT preserve viewport center Y:\n` +
          `  Before zoom: ${centerBefore.y.toFixed(2)}\n` +
          `  After zoom: ${centerAfter.y.toFixed(2)}\n` +
          `  Delta: ${drift.y.toFixed(2)}px (exceeds tolerance of ${TOLERANCE}px)\n\n` +
          `Likely cause: Incorrect transform-origin calculation\n` +
          `Check: PreviewPanel.ts lines 716-743 (transform-origin setting)`
        ).toBeLessThanOrEqual(TOLERANCE);

        // Verify zoom level increased to 110%
        const zoomText = await page.textContent(SELECTORS.zoomLevel);
        expect(zoomText).toBe('110%');

      } catch (error) {
        logDiagnostics(stateBefore, stateAfter, 'Zoom In');
        throw error;
      }
    });

    /**
     * Scenario 3: Zoom Out to 100% - Position Restoration
     *
     * Requirement: When zoom returns to 100%, the diagram should return to its
     * initial centered position. This ensures that zooming in and out is a
     * reversible operation that doesn't leave the diagram in an unexpected state.
     */
    test('Zoom out to 100%: Returns to initial position', async ({ page }) => {
      // Arrange: Open modal and capture initial state
      await openModal(page, diagram.selector);
      const initialState = await captureState(page);
      const initialDiagramCenter = calculateDiagramCenter(initialState);

      // Act: Zoom in twice, then zoom out twice to return to 100%
      await page.click(SELECTORS.zoomIn); // 110%
      await page.waitForTimeout(100);
      await page.click(SELECTORS.zoomIn); // 120%
      await page.waitForTimeout(100);
      await page.click(SELECTORS.zoomOut); // 110%
      await page.waitForTimeout(100);
      await page.click(SELECTORS.zoomOut); // 100%
      await page.waitForTimeout(100);

      // Capture final state
      const finalState = await captureState(page);
      const finalDiagramCenter = calculateDiagramCenter(finalState);
      const finalViewportCenter = calculateViewportCenter(finalState);

      // Calculate position delta
      const positionDelta = calculateCenterDrift(initialDiagramCenter, finalDiagramCenter);
      const centeringDelta = calculateCenterDrift(finalDiagramCenter, finalViewportCenter);

      // Assert: Position should match initial state
      try {
        expect(positionDelta.x,
          `Diagram did NOT return to initial X position:\n` +
          `  Initial center X: ${initialDiagramCenter.x.toFixed(2)}\n` +
          `  Final center X: ${finalDiagramCenter.x.toFixed(2)}\n` +
          `  Delta: ${positionDelta.x.toFixed(2)}px (exceeds tolerance of ${TOLERANCE}px)\n\n` +
          `Likely cause: Zoom-out logic doesn't restore original position\n` +
          `Check: transform-origin reset at zoom <= 100%`
        ).toBeLessThanOrEqual(TOLERANCE);

        expect(positionDelta.y,
          `Diagram did NOT return to initial Y position:\n` +
          `  Initial center Y: ${initialDiagramCenter.y.toFixed(2)}\n` +
          `  Final center Y: ${finalDiagramCenter.y.toFixed(2)}\n` +
          `  Delta: ${positionDelta.y.toFixed(2)}px (exceeds tolerance of ${TOLERANCE}px)\n\n` +
          `Likely cause: Zoom-out logic doesn't restore original position\n` +
          `Check: transform-origin reset at zoom <= 100%`
        ).toBeLessThanOrEqual(TOLERANCE);

        // Verify diagram is re-centered
        expect(centeringDelta.x,
          `Diagram not re-centered horizontally at 100%`
        ).toBeLessThanOrEqual(TOLERANCE);

        expect(centeringDelta.y,
          `Diagram not re-centered vertically at 100%`
        ).toBeLessThanOrEqual(TOLERANCE);

        // Verify zoom level is 100%
        const zoomText = await page.textContent(SELECTORS.zoomLevel);
        expect(zoomText).toBe('100%');

      } catch (error) {
        logDiagnostics(initialState, finalState, 'Zoom Out to 100%');
        throw error;
      }
    });

    /**
     * Scenario 4: Reset Button - Complete State Restoration
     *
     * Requirement: When user clicks reset button, zoom and position should return
     * to initial state (100% zoom, centered diagram). This provides a quick way
     * to recover from complex zoom/pan operations.
     */
    test('Reset button: Returns to initial state', async ({ page }) => {
      // Arrange: Open modal and capture initial state
      await openModal(page, diagram.selector);
      const initialState = await captureState(page);
      const initialDiagramCenter = calculateDiagramCenter(initialState);

      // Act: Perform multiple zoom operations
      await page.click(SELECTORS.zoomIn); // 110%
      await page.waitForTimeout(100);
      await page.click(SELECTORS.zoomIn); // 120%
      await page.waitForTimeout(100);
      await page.click(SELECTORS.zoomIn); // 130%
      await page.waitForTimeout(100);

      // Click RESET button
      await page.click(SELECTORS.zoomReset);
      await page.waitForTimeout(100);

      // Capture reset state
      const resetState = await captureState(page);
      const resetDiagramCenter = calculateDiagramCenter(resetState);
      const resetViewportCenter = calculateViewportCenter(resetState);

      // Calculate deltas
      const positionDelta = calculateCenterDrift(initialDiagramCenter, resetDiagramCenter);
      const centeringDelta = calculateCenterDrift(resetDiagramCenter, resetViewportCenter);

      // Assert: State should match initial state
      try {
        // Verify zoom reset to 100%
        const zoomText = await page.textContent(SELECTORS.zoomLevel);
        expect(zoomText, 'Reset did not return zoom to 100%').toBe('100%');

        // Verify position matches initial position
        expect(positionDelta.x,
          `Reset did NOT restore initial X position:\n` +
          `  Initial center X: ${initialDiagramCenter.x.toFixed(2)}\n` +
          `  Reset center X: ${resetDiagramCenter.x.toFixed(2)}\n` +
          `  Delta: ${positionDelta.x.toFixed(2)}px\n\n` +
          `Likely cause: Reset button doesn't restore initial scroll/position\n` +
          `Check: Reset button handler implementation`
        ).toBeLessThanOrEqual(TOLERANCE);

        expect(positionDelta.y,
          `Reset did NOT restore initial Y position:\n` +
          `  Initial center Y: ${initialDiagramCenter.y.toFixed(2)}\n` +
          `  Reset center Y: ${resetDiagramCenter.y.toFixed(2)}\n` +
          `  Delta: ${positionDelta.y.toFixed(2)}px\n\n` +
          `Likely cause: Reset button doesn't restore initial scroll/position\n` +
          `Check: Reset button handler implementation`
        ).toBeLessThanOrEqual(TOLERANCE);

        // Verify diagram is centered after reset
        expect(centeringDelta.x,
          `Diagram not centered horizontally after reset`
        ).toBeLessThanOrEqual(TOLERANCE);

        expect(centeringDelta.y,
          `Diagram not centered vertically after reset`
        ).toBeLessThanOrEqual(TOLERANCE);

        // Verify viewport scroll reset to 0
        expect(resetState.viewport.scrollLeft,
          'Viewport scrollLeft not reset to 0'
        ).toBe(0);

        expect(resetState.viewport.scrollTop,
          'Viewport scrollTop not reset to 0'
        ).toBe(0);

      } catch (error) {
        logDiagnostics(initialState, resetState, 'Reset Button');
        throw error;
      }
    });

    /**
     * Scenario 5: Multiple Zoom Cycles - Drift Prevention
     *
     * Requirement: When user performs multiple zoom in/out cycles, there should be
     * no accumulated drift in viewport center position. This ensures the zoom
     * algorithm is numerically stable and doesn't degrade over repeated operations.
     */
    test('Multiple zoom cycles: Center preservation maintained', async ({ page }) => {
      // Arrange: Open modal
      await openModal(page, diagram.selector);
      const initialState = await captureState(page);
      const initialCenter = calculateViewportCenter(initialState);

      // Act: Perform multiple zoom in/out cycles
      for (let cycle = 0; cycle < 3; cycle++) {
        // Zoom in
        await page.click(SELECTORS.zoomIn);
        await page.waitForTimeout(100);

        // Verify center preserved after zoom in
        const afterZoomIn = await captureState(page);
        const centerAfterZoomIn = calculateViewportCenter(afterZoomIn);
        const driftAfterZoomIn = calculateCenterDrift(initialCenter, centerAfterZoomIn);

        expect(driftAfterZoomIn.x,
          `Cycle ${cycle + 1}: Center drift X after zoom in: ${driftAfterZoomIn.x.toFixed(2)}px`
        ).toBeLessThanOrEqual(TOLERANCE);

        expect(driftAfterZoomIn.y,
          `Cycle ${cycle + 1}: Center drift Y after zoom in: ${driftAfterZoomIn.y.toFixed(2)}px`
        ).toBeLessThanOrEqual(TOLERANCE);

        // Zoom out
        await page.click(SELECTORS.zoomOut);
        await page.waitForTimeout(100);
      }

      // Final verification: Should be back at initial state
      const finalState = await captureState(page);
      const finalCenter = calculateViewportCenter(finalState);
      const finalDrift = calculateCenterDrift(initialCenter, finalCenter);

      expect(finalDrift.x,
        `After 3 cycles: Final center drift X: ${finalDrift.x.toFixed(2)}px`
      ).toBeLessThanOrEqual(TOLERANCE);

      expect(finalDrift.y,
        `After 3 cycles: Final center drift Y: ${finalDrift.y.toFixed(2)}px`
      ).toBeLessThanOrEqual(TOLERANCE);
    });

  });
}
