import { describe, it, expect, vi, beforeEach } from 'vitest';
// Import mocks before implementation code
import './testMocks';
import { render } from '@testing-library/react';
import React from 'react';
import LondonMapScene from './LondonMapScene';
import { SpatialBillboardSlot } from '../inventory/types';
import { mockSetProps } from './testMocks';

describe('LondonMapScene Layers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_MAPBOX_TOKEN', 'pk.test-token');
  });

  it('creates billboard markers and halos for each slot', () => {
    const mockSlots: SpatialBillboardSlot[] = [
      { id: '1', name: 'Slot 1', basePrice: 100, bidIncrement: 10, lat: 51.5, lon: -0.1 },
    ];

    render(<LondonMapScene slots={mockSlots} />);

    expect(mockSetProps).toHaveBeenCalled();
    const lastCall = mockSetProps.mock.calls[mockSetProps.mock.calls.length - 1][0];
    
    const iconLayer = lastCall.layers.find((l: any) => l.id === 'billboard-icons');
    const haloLayer = lastCall.layers.find((l: any) => l.id === 'billboard-halos');
    
    expect(iconLayer).toBeDefined();
    expect(haloLayer).toBeDefined();
    
    // Verification of visual constraints for :AdditionalFunctionality: (Flat Icons)
    expect(iconLayer.props.billboard).toBe(true); 
    expect(iconLayer.props.sizeUnits).toBe('pixels');
    expect(iconLayer.props.getIcon().mask).toBe(true); 
    expect(haloLayer.props.stroked).toBe(true); 
    expect(haloLayer.props.getRadius(mockSlots[0])).toBeLessThan(20); // Modest ring
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
});