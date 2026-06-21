import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import MiniMap from './MiniMap';

// Mock react-map-gl
vi.mock('react-map-gl', () => ({
  default: vi.fn(({ longitude, latitude, zoom, pitch, interactive, 'data-testid': testId }) => (
    <div 
      data-testid={testId || "mock-mini-map"}
      data-lon={longitude}
      data-lat={latitude}
      data-zoom={zoom}
      data-pitch={pitch}
      data-interactive={interactive ? 'true' : 'false'}
    />
  )),
}));

describe('MiniMap', () => {
  it('renders with correct center coordinates and fixed 2D view', () => {
    const testLon = -0.12;
    const testLat = 51.51;
    const { getByTestId } = render(<MiniMap longitude={testLon} latitude={testLat} />);
    
    const map = getByTestId('mini-map-instance');
    expect(parseFloat(map.getAttribute('data-lon')!)).toBe(testLon);
    expect(parseFloat(map.getAttribute('data-lat')!)).toBe(testLat);
    expect(map.getAttribute('data-pitch')).toBe('0');
    expect(map.getAttribute('data-interactive')).toBe('false');
  });

  it('applies glassmorphism styles to the container', () => {
    const { getByTestId } = render(<MiniMap longitude={0} latitude={0} />);
    const container = getByTestId('mini-map-container');
    
    // Check styles directly via the style attribute if computed style fails in JSDOM
    expect(container.style.borderRadius).toBe('16px');
    expect(container.style.backdropFilter).toContain('blur');
    expect(container.style.position).toBe('absolute');
  });
});