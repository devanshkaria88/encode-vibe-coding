import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
// Import mocks before implementation code
import './testMocks';
import React from 'react';
import LondonMapScene from './LondonMapScene';
import { SpatialBillboardSlot } from '../inventory/types';

describe('LondonMapScene', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Mapbox component with the correct Standard style and token', () => {
    vi.stubEnv('VITE_MAPBOX_TOKEN', 'pk.test-token');

    const { getByTestId } = render(<LondonMapScene />);
    const mapRoot = getByTestId('main-map');

    expect(mapRoot.getAttribute('data-style')).toBe('mapbox://styles/mapbox/standard');
    expect(mapRoot.getAttribute('data-token')).toBe('pk.test-token');
  });

  it('initializes the camera at the specified London coordinates, pitch, and zoom 19', () => {
    vi.stubEnv('VITE_MAPBOX_TOKEN', 'pk.test-token');
    const { getByTestId } = render(<LondonMapScene />);
    const mapRoot = getByTestId('main-map');

    expect(parseFloat(mapRoot.getAttribute('data-lat')!)).toBeCloseTo(51.5074);
    expect(parseFloat(mapRoot.getAttribute('data-lon')!)).toBeCloseTo(-0.1278);
    expect(mapRoot.getAttribute('data-pitch')).toBe('60');
    expect(mapRoot.getAttribute('data-zoom')).toBe('19');
  });

  it('attempts to fly to user geolocation if inside London', async () => {
    const mockCoords = { latitude: 51.51, longitude: -0.12 }; // Inside London
    const getCurrentPositionMock = vi.fn((success) => success({ coords: mockCoords }));
    
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: getCurrentPositionMock
      }
    });

    vi.stubEnv('VITE_MAPBOX_TOKEN', 'pk.test-token');
    const { getByTestId } = render(<LondonMapScene />);
    
    const mapRoot = getByTestId('main-map');
    expect(parseFloat(mapRoot.getAttribute('data-lat')!)).toBeCloseTo(51.51);
    expect(parseFloat(mapRoot.getAttribute('data-lon')!)).toBeCloseTo(-0.12);
  });

  it('stays at default coordinates if geolocation is outside London', () => {
    const mockCoords = { latitude: 40.7128, longitude: -74.0060 }; // New York
    const getCurrentPositionMock = vi.fn((success) => success({ coords: mockCoords }));
    
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: getCurrentPositionMock
      }
    });

    vi.stubEnv('VITE_MAPBOX_TOKEN', 'pk.test-token');
    const { getByTestId } = render(<LondonMapScene />);
    const mapRoot = getByTestId('main-map');

    expect(parseFloat(mapRoot.getAttribute('data-lat')!)).toBeCloseTo(51.5074);
  });

  it('occupies the full viewport', () => {
    const { container } = render(<LondonMapScene />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.width).toBe('100vw');
    expect(wrapper.style.height).toBe('100vh');
  });

  it('enables rotation and includes navigation controls', () => {
    vi.stubEnv('VITE_MAPBOX_TOKEN', 'pk.test-token');
    const { getByTestId } = render(<LondonMapScene />);
    expect(getByTestId('main-map').getAttribute('data-rotate')).toBe('true');
    expect(getByTestId('nav-control')).toBeDefined();
  });

  it('centres camera on billboards at zoom 14 when slots load', () => {
    const mockSlots: SpatialBillboardSlot[] = [
      { id: '1', name: 'A', longitude: -0.1, latitude: 51.5, basePrice: 100, bidIncrement: 10 },
      { id: '2', name: 'B', longitude: -0.2, latitude: 51.6, basePrice: 100, bidIncrement: 10 }
    ];

    vi.stubEnv('VITE_MAPBOX_TOKEN', 'pk.test-token');
    const { getByTestId, rerender } = render(<LondonMapScene slots={[]} />);
    
    let mapRoot = getByTestId('main-map');
    expect(mapRoot.getAttribute('data-zoom')).toBe('19');

    rerender(<LondonMapScene slots={mockSlots} />);
    mapRoot = getByTestId('main-map');

    expect(parseFloat(mapRoot.getAttribute('data-lon')!)).toBeCloseTo(-0.15);
    expect(parseFloat(mapRoot.getAttribute('data-lat')!)).toBeCloseTo(51.55);
    expect(mapRoot.getAttribute('data-zoom')).toBe('14');
  });
});