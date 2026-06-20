import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Minimal mock for Mapbox/Canvas requirements if necessary
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn();
}

// Clear localStorage between tests to prevent state leakage in InventorySource
beforeEach(() => {
  localStorage.clear();
});