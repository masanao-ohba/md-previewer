import { Page, expect } from '@playwright/test';

/**
 * Modal state snapshot for zoom behavior testing
 * Captures all relevant DOM properties for coordinate measurement
 */
export interface ModalState {
  viewport: {
    clientWidth: number;
    clientHeight: number;
    scrollLeft: number;
    scrollTop: number;
  };
  diagram: {
    offsetLeft: number;
    offsetTop: number;
    offsetWidth: number;
    offsetHeight: number;
  };
  style: {
    transform: string;
    transformOrigin: string;
  };
  zoom: number;
}

/**
 * 2D point in coordinate space
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * DOM element selectors for modal zoom testing
 */
export const SELECTORS = {
  modal: '#diagram-modal',
  modalVisible: '#diagram-modal.modal-visible',
  viewport: '#modal-diagram-viewport',
  container: '#modal-diagram-container',
  wrapper: '#modal-diagram-wrapper',
  zoomIn: '#modal-zoom-in',
  zoomOut: '#modal-zoom-out',
  zoomReset: '#modal-zoom-reset',
  zoomLevel: '#modal-zoom-level',
  closeButton: '#modal-close-button',
  mermaidDiagram: '.mermaid-container.diagram-clickable',
  plantumlDiagram: '.plantuml-container.diagram-clickable'
} as const;

/**
 * Tolerance for coordinate comparisons (pixels)
 * Accounts for sub-pixel rendering and floating-point rounding
 */
export const TOLERANCE = 5;

/**
 * Capture complete snapshot of modal state for comparison
 *
 * @param page - Playwright page object
 * @returns Promise resolving to modal state snapshot
 * @throws Error if modal elements are not found
 */
export async function captureState(page: Page): Promise<ModalState> {
  return await page.evaluate((selectors) => {
    const viewport = document.querySelector(selectors.viewport) as HTMLElement;
    const container = document.querySelector(selectors.container) as HTMLElement;
    const zoomLevel = document.querySelector(selectors.zoomLevel) as HTMLElement;

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
      zoom: parseInt(zoomLevel.textContent?.replace('%', '') || '100')
    };
  }, SELECTORS);
}

/**
 * Calculate the center point of the viewport in viewport coordinate space
 *
 * Formula: center = scroll + dimension / 2
 *
 * @param state - Modal state snapshot
 * @returns Viewport center coordinates
 */
export function calculateViewportCenter(state: ModalState): Point {
  return {
    x: state.viewport.scrollLeft + state.viewport.clientWidth / 2,
    y: state.viewport.scrollTop + state.viewport.clientHeight / 2
  };
}

/**
 * Calculate the center point of the diagram in viewport coordinate space
 *
 * Formula: center = position + dimension / 2
 *
 * @param state - Modal state snapshot
 * @returns Diagram center coordinates
 */
export function calculateDiagramCenter(state: ModalState): Point {
  return {
    x: state.diagram.offsetLeft + state.diagram.offsetWidth / 2,
    y: state.diagram.offsetTop + state.diagram.offsetHeight / 2
  };
}

/**
 * Calculate how much the center point moved between two states
 *
 * @param before - State before operation
 * @param after - State after operation
 * @returns Absolute delta for X and Y coordinates
 */
export function calculateCenterDrift(before: Point, after: Point): Point {
  return {
    x: Math.abs(after.x - before.x),
    y: Math.abs(after.y - before.y)
  };
}

/**
 * Open modal by clicking a diagram element and wait for visibility
 *
 * @param page - Playwright page object
 * @param diagramSelector - CSS selector for diagram element
 */
export async function openModal(page: Page, diagramSelector: string): Promise<void> {
  await page.click(diagramSelector);
  await page.waitForSelector(SELECTORS.modalVisible, { timeout: 5000 });
  // Allow modal to fully render and stabilize
  await page.waitForTimeout(200);
}

/**
 * Close modal and wait for it to be hidden
 *
 * @param page - Playwright page object
 */
export async function closeModal(page: Page): Promise<void> {
  await page.click(SELECTORS.closeButton);
  await page.waitForSelector(SELECTORS.modal, { state: 'hidden', timeout: 5000 });
}

/**
 * Log minimal diagnostic information for debugging failures
 */
export function logDiagnostics(
  before: ModalState,
  after: ModalState,
  operation: string
): void {
  const centerBefore = calculateViewportCenter(before);
  const centerAfter = calculateViewportCenter(after);
  const drift = calculateCenterDrift(centerBefore, centerAfter);

  console.log(`\n❌ TEST FAILED: ${operation}`);
  console.log(`Zoom: ${before.zoom}% → ${after.zoom}%`);
  console.log(`Center drift: X=${drift.x.toFixed(2)}px, Y=${drift.y.toFixed(2)}px (tolerance: ${TOLERANCE}px)\n`);
}

/**
 * Custom matcher for coordinate comparison with tolerance
 * Extends Playwright's expect with toBeWithinTolerance matcher
 */
expect.extend({
  toBeWithinTolerance(
    received: number,
    expected: number,
    tolerance: number,
    label: string = 'value'
  ) {
    const delta = Math.abs(received - expected);
    const pass = delta <= tolerance;

    return {
      pass,
      message: () => {
        if (pass) {
          return `Expected ${label} ${received} NOT to be within ${tolerance}px of ${expected}`;
        } else {
          return [
            `Expected ${label} to be within ${tolerance}px of ${expected}`,
            `  Expected: ${expected}`,
            `  Received: ${received}`,
            `  Delta:    ${delta.toFixed(2)}px`,
            `  Tolerance: ${tolerance}px`,
            `  Exceeded by: ${(delta - tolerance).toFixed(2)}px`
          ].join('\n');
        }
      }
    };
  }
});

// TypeScript type augmentation for custom matcher
declare global {
  namespace PlaywrightTest {
    interface Matchers<R> {
      toBeWithinTolerance(expected: number, tolerance: number, label?: string): R;
    }
  }
}
