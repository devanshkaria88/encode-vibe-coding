import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import LondonMapScene from './LondonMapScene';
import { SpatialBillboardSlot } from '../inventory/types';

// Mock react-map-gl to avoid WebGL context issues
vi.mock('react-map-gl', () => ({
  default: vi.fn(({ children, mapStyle, mapboxAccessToken, pitch, latitude, longitude, zoom }) => (
    <div data-testid="mapbox-root" 
         data-style={mapStyle} 
         data-token={mapboxAccessToken}
         data-pitch={pitch}
         data-lat={latitude}
         data-lon={longitude}
         data-zoom={zoom}>
      {children}
    </div>
  )),
  useControl: vi.fn((fn) => fn())
}));

// Mock deck.gl mapbox overlay
const mockSetProps = vi.fn();
vi.mock('@deck.gl/mapbox', () => ({
  MapboxOverlay: vi.fn().mockImplementation(() => ({
    setProps: mockSetProps,
  })),
}));

describe('LondonMapScene', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('renders the Mapbox component with the correct Standard style and token', () => {
    // Set env mock
    vi.stubEnv('VITE_MAPBOX_TOKEN', 'pk.test-token');

    const { getByTestId } = render(<LondonMapScene />);
    const mapRoot = getByTestId('mapbox-root');

    expect(mapRoot.getAttribute('data-style')).toBe('mapbox://styles/mapbox/standard');
    expect(mapRoot.getAttribute('data-token')).toBe('pk.test-token');
  });

  it('initializes the camera at the specified London coordinates, pitch, and zoom 19', () => {
    const { getByTestId } = render(<LondonMapScene />);
    const mapRoot = getByTestId('mapbox-root');

    // London: ~51.5074, -0.1278
    expect(parseFloat(mapRoot.getAttribute('data-lat')!)).toBeCloseTo(51.5074);
    expect(parseFloat(mapRoot.getAttribute('data-lon')!)).toBeCloseTo(-0.1278);
    // Pitch requirement: 60 degrees
    expect(mapRoot.getAttribute('data-pitch')).toBe('60');
    // New zoom requirement: 19
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

    const { getByTestId, rerender } = render(<LondonMapScene />);
    
    // We expect the state to update, which causes a re-render
    const mapRoot = getByTestId('mapbox-root');
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

    const { getByTestId } = render(<LondonMapScene />);
    const mapRoot = getByTestId('mapbox-root');

    // Should stay at London center
    expect(parseFloat(mapRoot.getAttribute('data-lat')!)).toBeCloseTo(51.5074);
  });

  it('creates billboard markers and halos for each slot', () => {
    const mockSlots: SpatialBillboardSlot[] = [
      { id: '1', name: 'Slot 1', basePrice: 100, bidIncrement: 10, lat: 51.5, lon: -0.1 },
    ];

    render(<LondonMapScene slots={mockSlots} />);

    expect(mockSetProps).toHaveBeenCalled();
    const lastCall = mockSetProps.mock.calls[mockSetProps.mock.calls.length - 1][0];
    
    const columnLayer = lastCall.layers.find((l: any) => l.id === 'billboard-columns');
    const haloLayer = lastCall.layers.find((l: any) => l.id === 'billboard-halos');
    
    expect(columnLayer).toBeDefined();
    expect(haloLayer).toBeDefined();
    
    // Verification of :AdditionalFunctionality: visual constraints
    expect(columnLayer.props.radius).toBeLessThanOrEqual(5); // Should be a thin post
    expect(columnLayer.props.getElevation()).toBeGreaterThan(0); // Should be raised
    expect(haloLayer.props.data).toHaveLength(1);
  });

  it('creates an ArcLayer for recent bids', () => {
    const mockSlots: SpatialBillboardSlot[] = [
      { id: 's1', name: 'Slot 1', basePrice: 100, bidIncrement: 10, lat: 51.5, lon: -0.1 },
    ];
    const mockBids = [
      { agentId: 'agent-1', slotId: 's1', round: 1, amount: 110 }
    ];

    render(<LondonMapScene slots={mockSlots} recentBids={mockBids} />);

    const lastCall = mockSetProps.mock.calls[mockSetProps.mock.calls.length - 1][0];
    const arcLayer = lastCall.layers.find((l: any) => l.id === 'bid-arcs');
    
    expect(arcLayer).toBeDefined();
    expect(arcLayer.props.data.length).toBeGreaterThan(0);
    expect(arcLayer.props.data[0].agentId).toBe('agent-1');
  });

  it('occupies the full viewport', () => {
    const { container } = render(<LondonMapScene />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.width).toBe('100vw');
    expect(wrapper.style.height).toBe('100vh');
  });
});