import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import App from './App';
import { vi } from 'vitest';

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
    
    // In actual orchestration (async), we'd wait for completion
    // but the requirement says assert settled state or progress based on observable
  });

  it('renders glassmorphism panel with correct styles', () => {
    render(<App />);
    const panel = screen.getByText('Arbiter').parentElement!;
    
    // In jsdom, computedStyle might not resolve complex/prefixed properties like backdropFilter.
    // We check the inline style object which reflects the React props.
    const style = (panel as HTMLElement).style;
    
    expect(style.backdropFilter).toBe('blur(10px)');
    expect(style.background).toContain('rgba(20, 20, 30, 0.7)');
  });

  it('renders the map region', () => {
    render(<App />);
    const mapStage = screen.getByRole('region', { name: /london map stage/i });
    expect(mapStage).toBeInTheDocument();
  });
});