import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// Mock Canvas/WebGL support
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn((type) => {
    if (type === '2d') {
      return {
        getImageData: vi.fn(() => ({
          data: new Uint8ClampedArray(4),
          width: 1,
          height: 1,
        })),
        canvas: {},
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        putImageData: vi.fn(),
        setTransform: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
      };
    }
    return {
      getExtension: vi.fn(),
      getParameter: vi.fn(),
      clearColor: vi.fn(),
      clear: vi.fn(),
      createShader: vi.fn(),
      bufferData: vi.fn(),
    };
  }) as any;
}

// Mapbox GL JS often uses URL.createObjectURL for workers
if (typeof window !== 'undefined' && !window.URL.createObjectURL) {
  window.URL.createObjectURL = vi.fn(() => 'mock-url');
}

// Mock WebGLRenderingContext to satisfy Mapbox support check
if (typeof window !== 'undefined') {
  (window as any).WebGLRenderingContext = vi.fn();
}

// Clear localStorage between tests to prevent state leakage in InventorySource
beforeEach(() => {
  localStorage.clear();
});