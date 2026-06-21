import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AuctionHUD from '../ui/AuctionHUD';
import { BillboardSlot } from '../core/index';
import { RoundEvent } from '../arena/types';

describe('AuctionHUD Conformance', () => {
  const mockSlots: BillboardSlot[] = [
    { id: 'slot-1', name: 'Piccadilly Lights', basePrice: 1000, bidIncrement: 100 },
    { id: 'slot-2', name: 'Waterloo Bridge', basePrice: 500, bidIncrement: 50 }
  ];

  const mockEvent: RoundEvent = {
    round: 5,
    standingBids: { 'slot-1': 1500, 'slot-2': 750 },
    dropOuts: {},
    remainingBudgets: { 'agent-alpha': 12500, 'agent-beta': 5000 }
  };

  it('AuctionHUD_InitialEmptyState: should render nothing when event is null', () => {
    const { container } = render(<AuctionHUD event={null} slots={mockSlots} />);
    expect(container.firstChild).toBeNull();
  });

  it('AuctionHUD_GlassmorphismStyling_Conformance: should apply specific glassmorphism styles and corner positioning', () => {
    render(<AuctionHUD event={mockEvent} slots={mockSlots} />);
    
    const panel = screen.getByTestId('auction-hud');
    expect(panel).toBeInTheDocument();

    expect(panel.style.position).toBe('absolute');
    expect(panel.style.top).toBe('220px');
    expect(panel.style.right).toBe('20px');

    // Updated to match refined liquid-glass requirement (8px blur, 20% opacity)
    expect(panel.style.background).toBe('rgba(15, 15, 25, 0.2)');
    expect(panel.style.backdropFilter).toContain('blur(8px)');
    expect(panel.style.border).toBe('1px solid rgba(255, 255, 255, 0.15)');
  });

  it('AuctionHUD_AgentBudget_Formatting: should render formatted currency values for multiple agents', () => {
    render(<AuctionHUD event={mockEvent} slots={mockSlots} />);

    expect(screen.getByText('agent-alpha')).toBeInTheDocument();
    expect(screen.getByText('agent-beta')).toBeInTheDocument();

    expect(screen.getByText('£12,500')).toBeInTheDocument();
    expect(screen.getByText('£5,000')).toBeInTheDocument();
  });

  it('AuctionHUD_SlotName_Resolution: should resolve slot IDs to human-readable names', () => {
    render(<AuctionHUD event={mockEvent} slots={mockSlots} />);

    expect(screen.getByText('Piccadilly Lights')).toBeInTheDocument();
    expect(screen.getByText('Waterloo Bridge')).toBeInTheDocument();
    
    expect(screen.getByText(/Round 5/i)).toBeInTheDocument();
    expect(screen.getByText('£1,500')).toBeInTheDocument();
    expect(screen.getByText('£750')).toBeInTheDocument();
  });

  it('AuctionHUD_Decluttering: should limit display to 5 slots and show summary', () => {
    const manySlots: BillboardSlot[] = Array.from({ length: 10 }, (_, i) => ({
      id: `s${i}`, name: `Slot ${i}`, basePrice: 100, bidIncrement: 10
    }));
    const manyBids = Object.fromEntries(manySlots.map(s => [s.id, 200]));
    
    const event: RoundEvent = {
      round: 1,
      standingBids: manyBids,
      dropOuts: {},
      remainingBudgets: {}
    };

    render(<AuctionHUD event={event} slots={manySlots} />);
    
    expect(screen.getAllByText(/Slot \d/)).toHaveLength(5);
    expect(screen.getByText(/\+ 5 more slots/i)).toBeInTheDocument();
    expect(screen.getByText(/10 Contested/i)).toBeInTheDocument();
  });
});