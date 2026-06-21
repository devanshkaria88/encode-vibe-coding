import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import App from '../App';
import AuctionHUD from './AuctionHUD';
import { RoundEvent } from '../arena/types';

describe('Liquid Glass Styling Conformance', () => {
  it('App control panel should have liquid glass styles', () => {
    render(<App />);
    const panel = screen.getByText('Arbiter').parentElement!;
    const style = panel.style;

    expect(style.backdropFilter).toContain('blur(20px)');
    expect(style.backdropFilter).toContain('saturate(180%)');
    expect(style.background).toBe('rgba(15, 15, 25, 0.25)');
    expect(style.boxShadow).toContain('inset 0 1px 0 0 rgba(255, 255, 255, 0.1)');
  });

  it('AuctionHUD should have liquid glass styles', () => {
    const mockEvent: RoundEvent = {
      round: 1,
      standingBids: {},
      dropOuts: {},
      remainingBudgets: {}
    };
    render(<AuctionHUD event={mockEvent} slots={[]} />);
    
    const hud = screen.getByText(/Round 1/i).closest('div')?.parentElement!;
    const style = hud.style;

    expect(style.backdropFilter).toContain('blur(20px)');
    expect(style.background).toBe('rgba(15, 15, 25, 0.25)');
    expect(style.border).toBe('1px solid rgba(255, 255, 255, 0.15)');
  });
});