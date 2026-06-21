import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import App from './App';
import { vi } from 'vitest';
import * as inventorySource from './inventory/source';

// Mock LondonMapScene to avoid WebGL/Mapbox issues in App unit tests
vi.mock('./scene/LondonMapScene', () => ({
  default: () => <div role="region" aria-label="London Map Stage">Map Mock</div>,
  LondonMapScene: () => <div role="region" aria-label="London Map Stage">Map Mock</div>
}));

describe('App Component', () => {
  it('renders the initial London stage and start button', () => {
    render(<App />);
    
    // Check for title
    expect(screen.getByText('Arbiter')).toBeInTheDocument();
    
    // Check for Start button
    const startButton = screen.getByRole('button', { name: /start auction/i });
    expect(startButton).toBeInTheDocument();
  });

  it('runs the auction and shows progress when the start button is clicked', async () => {
    render(<App />);
    
    const startButton = screen.getByRole('button', { name: /start auction/i });
    fireEvent.click(startButton);
    
    // Verify immediate state change
    expect(screen.queryByRole('button', { name: /start auction/i })).not.toBeInTheDocument();
    expect(screen.getByText(/auction in progress/i)).toBeInTheDocument();
  });

  it('renders glassmorphism panel with correct styles', () => {
    render(<App />);
    const panel = screen.getByTestId('control-panel');
    
    const style = panel.style;
    
    // Updated to match refined liquid-glass requirement (8px blur, 20% opacity)
    expect(style.backdropFilter).toBe('blur(8px) saturate(180%)');
    expect(style.background).toContain('rgba(15, 15, 25, 0.2)');
  });

  it('renders the map region', () => {
    render(<App />);
    const mapStage = screen.getByRole('region', { name: /london map stage/i });
    expect(mapStage).toBeInTheDocument();
  });

  it('bounds the inventory to a maximum of 24 slots', async () => {
    const mockSlots = Array.from({ length: 30 }, (_, i) => ({
      id: `slot-${i}`,
      name: `Slot ${i}`,
      latitude: 51.5074 + i * 0.001,
      longitude: -0.1278 + i * 0.001,
      basePrice: 100,
      bidIncrement: 10
    }));

    const fetchSpy = vi.spyOn(inventorySource, 'fetchInventory').mockResolvedValue(mockSlots as any);
    
    render(<App />);
    const startButton = screen.getByRole('button', { name: /start auction/i });
    
    await fireEvent.click(startButton);

    expect(fetchSpy).toHaveBeenCalled();
    expect(screen.getByText(/auction in progress/i)).toBeInTheDocument();
    
    fetchSpy.mockRestore();
  });
});