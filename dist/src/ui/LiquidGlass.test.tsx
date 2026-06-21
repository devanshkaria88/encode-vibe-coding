import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import App from '../App';
import AuctionHUD from './AuctionHUD';
import ScorecardPanel from './ScorecardPanel';
import { RoundEvent } from '../arena/types';
import { AgentScorecard } from '../core/model';

describe('Liquid Glass Styling Conformance (Lightened)', () => {
  it('App control panel should have lightened liquid glass styles', () => {
    render(<App />);
    const panel = screen.getByTestId('control-panel');
    
    // Check for lightened background (20% opacity)
    expect(panel.style.background).toBe('rgba(15, 15, 25, 0.2)');
    // Check for reduced blur (8px)
    expect(panel.style.backdropFilter).toContain('blur(8px)');
  });

  it('AuctionHUD should have lightened liquid glass styles', () => {
    const mockEvent: RoundEvent = {
      round: 1,
      standingBids: {},
      dropOuts: {},
      remainingBudgets: {}
    };
    render(<AuctionHUD event={mockEvent} slots={[]} />);
    const hud = screen.getByTestId('auction-hud');

    expect(hud.style.background).toBe('rgba(15, 15, 25, 0.2)');
    expect(hud.style.backdropFilter).toContain('blur(8px)');
  });

  it('ScorecardPanel should have lightened liquid glass styles', () => {
    const mockScorecard: AgentScorecard = {
      agentId: 'agent-1',
      surplusCaptured: 100,
      overpayment: 50,
      leftOnTable: 0,
      concessionErrors: []
    };
    render(<ScorecardPanel scorecard={mockScorecard} />);
    const panel = screen.getByTestId('scorecard-agent-1');

    expect(panel.style.background).toBe('rgba(15, 15, 25, 0.2)');
    expect(panel.style.backdropFilter).toContain('blur(8px)');
  });
});