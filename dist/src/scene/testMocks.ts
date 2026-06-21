import { vi } from 'vitest';
import React from 'react';

// Mock deck.gl mapbox overlay
export const mockSetProps = vi.fn();

// In Vitest, variables used in vi.mock must start with 'mock'
export const mockMapComponent = vi.fn((props: any) => {
  const { 
    children, mapStyle, mapboxAccessToken, pitch, latitude, longitude, 
    zoom, dragRotate, id, 'data-testid': testId 
  } = props;
  
  return React.createElement('div', {
    'data-testid': testId || "main-map",
    id: id || "main-map",
    'data-style': mapStyle,
    'data-token': mapboxAccessToken,
    'data-pitch': pitch,
    'data-lat': latitude,
    'data-lon': longitude,
    'data-zoom': zoom,
    'data-rotate': dragRotate ? 'true' : 'false'
  }, children);
});

// Alias for tests that expect MapMock
export const MapMock = mockMapComponent;

// Mock mapbox-gl to prevent 'Map not supported' and other environment errors
vi.mock('mapbox-gl', () => ({
  default: {
    supported: () => true,
    Map: vi.fn(() => ({
      on: vi.fn(),
      remove: vi.fn(),
      setConfigProperty: vi.fn(),
      getConfigProperty: vi.fn(),
    })),
  },
}));

// Mock react-map-gl components
vi.mock('react-map-gl', () => {
  return {
    __esModule: true,
    default: (props: any) => mockMapComponent(props),
    Map: (props: any) => mockMapComponent(props),
    useControl: vi.fn((fn) => {
      return fn?.();
    }),
    NavigationControl: vi.fn(() => React.createElement('div', { 'data-testid': 'nav-control' })),
    MapProvider: ({ children }: { children: any }) => children,
  };
});

// Mock deck.gl mapbox integration
vi.mock('@deck.gl/mapbox', () => ({
  MapboxOverlay: vi.fn().mockImplementation(() => ({
    setProps: mockSetProps,
    finalize: vi.fn(),
  })),
}));

/**
 * Centrally manages mocks for Mapbox-related libraries.
 * Initialized via file-level vi.mock calls to ensure hoisting works.
 */
export const setupMapMocks = () => {
  // This function is now a placeholder for consistency with existing test imports
  // since vi.mock is hoisted to top-level.
};