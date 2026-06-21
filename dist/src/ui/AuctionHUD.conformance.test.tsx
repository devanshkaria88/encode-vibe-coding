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
    
    // The component is the first div inside the root of the render
    const panel = screen.getByText(/Round 5/i).closest('div')?.parentElement;
    expect(panel).not.toBeNull();

    if (panel) {
      const style = window.getComputedStyle(panel);
      
      // Check for absolute positioning in corner
      expect(style.position).toBe('absolute');
      expect(style.top).toBe('20px');
      expect(style.right).toBe('20px');

      // Check glassmorphism characteristics
      expect(style.backgroundColor).toContain('rgba(15, 15, 25, 0.25)');
      
      // JSDOM does not compute backdropFilter. We check the element style directly as a fallback.
      const backdropFilter = style.backdropFilter || panel.style.backdropFilter;
      expect(backdropFilter).toContain('blur(20px)');
      
      expect(style.border).toContain('rgba(255, 255, 255, 0.15)');
    }
  });

  it('AuctionHUD_AgentBudget_Formatting: should render formatted currency values for multiple agents', () => {
    render(<AuctionHUD event={mockEvent} slots={mockSlots} />);

    // Check presence of agent markers. 
    // Implementation was updated to avoid collisions, so 'agent-alpha' and 'agent-beta' are now distinct.
    expect(screen.getByText(/Agent agent-alpha/i)).toBeInTheDocument();
    expect(screen.getByText(/Agent agent-beta/i)).toBeInTheDocument();

    // Check locale-specific formatting (e.g. 12,500)
    expect(screen.getByText('£12,500')).toBeInTheDocument();
    expect(screen.getByText('£5,000')).toBeInTheDocument();
  });

  it('AuctionHUD_SlotName_Resolution: should resolve slot IDs to human-readable names', () => {
    render(<AuctionHUD event={mockEvent} slots={mockSlots} />);

    // Verify names from inventory are used instead of IDs
    expect(screen.getByText('Piccadilly Lights')).toBeInTheDocument();
    expect(screen.getByText('Waterloo Bridge')).toBeInTheDocument();
    expect(screen.queryByText('slot-1')).not.toBeInTheDocument();

    // Verify current round
    expect(screen.getByText(/Round 5/i)).toBeInTheDocument();
    
    // Verify standing bids
    expect(screen.getByText('£1,500')).toBeInTheDocument();
    expect(screen.getByText('£750')).toBeInTheDocument();
  });
});