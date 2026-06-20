import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ScorecardPanel from './ScorecardPanel';
import { AgentScorecard, createBillboardSlot } from '../core/model';
import { ClearingResult } from '../core/clearing';

describe('ScorecardPanel', () => {
  const mockSlot = createBillboardSlot({ id: 'slot-1', name: 'Westminster', basePrice: 100, bidIncrement: 10 });
  const mockScorecard: AgentScorecard = {
    agentId: 'agent-1',
    surplusCaptured: 1500,
    overpayment: 200,
    leftOnTable: 50,
    concessionErrors: [
      {
        agentId: 'agent-1',
        slotId: 'slot-a',
        round: 5,
        type: 'premature-drop',
        reason: 'Dropped at £100 despite valuation of £200'
      }
    ]
  };

  const mockResults: Record<string, ClearingResult> = {
    'slot-1': {
      slot: mockSlot,
      winner: { id: 'agent-1', budget: 5000, trueValuation: { 'slot-1': 2000 } },
      clearingPrice: 500,
      auditTrail: [
        { agentId: 'agent-1', slotId: 'slot-1', round: 1, amount: 100 },
        { agentId: 'agent-2', slotId: 'slot-1', round: 2, priceAtDropOut: 100 }
      ]
    }
  };

  it('renders money figures verbatim from the scorecard object', () => {
    render(<ScorecardPanel scorecard={mockScorecard} clearingResults={mockResults} />);
    
    // Check main figures
    expect(screen.getByText('£1,500')).toBeDefined();
    expect(screen.getByText('£200')).toBeDefined();
    expect(screen.getByText('£50')).toBeDefined();
    
    // Check labels
    expect(screen.getByText(/surplus/i)).toBeDefined();
    expect(screen.getByText(/overpaid/i)).toBeDefined();
  });

  it('renders concession error reasons exactly as provided', () => {
    render(<ScorecardPanel scorecard={mockScorecard} />);
    
    expect(screen.getByText(/Dropped at £100 despite valuation of £200/)).toBeDefined();
    expect(screen.getByText('Premature Drop:')).toBeDefined();
  });

  it('identifies the agent correctly in the header', () => {
    render(<ScorecardPanel scorecard={mockScorecard} clearingResults={mockResults} />);
    expect(screen.getByText('Agent agent-1')).toBeDefined();
  });

  it('reveals evidence events when Surplus is clicked', () => {
    render(<ScorecardPanel scorecard={mockScorecard} clearingResults={mockResults} />);
    
    const surplusLabel = screen.getByText(/Surplus/i);
    fireEvent.click(surplusLabel);

    expect(screen.getByText(/Evidence for surplus/i)).toBeDefined();
    expect(screen.getByText(/Round 1: agent-1 Bid £100/i)).toBeDefined();
  });

  it('reveals evidence events when Left on Table is clicked', () => {
    const dropoutResult: Record<string, ClearingResult> = {
      'slot-1': {
        slot: mockSlot,
        auditTrail: [
          { agentId: 'agent-1', slotId: 'slot-1', round: 3, priceAtDropOut: 400 }
        ]
      }
    };
    render(<ScorecardPanel scorecard={mockScorecard} clearingResults={dropoutResult} />);
    
    fireEvent.click(screen.getByText(/Left on Table/i));
    expect(screen.getByText(/Round 3: agent-1 Dropped at £400/i)).toBeDefined();
  });
});