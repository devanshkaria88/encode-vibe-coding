import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import AuctionHUD from './AuctionHUD';
import { RoundEvent } from '../arena/types';
import { BillboardSlot } from '../core/index';

describe('AuctionHUD', () => {
  const mockSlots: BillboardSlot[] = [
    { id: 's1', name: 'Piccadilly Circus', basePrice: 100, bidIncrement: 10 }
  ];

  const mockEvent: RoundEvent = {
    round: 5,
    standingBids: { 's1': 150 },
    dropOuts: {},
    remainingBudgets: { 'agent-1': 5000 }
  };

  it('renders the current round number', () => {
    render(<AuctionHUD event={mockEvent} slots={mockSlots} />);
    expect(screen.getByText(/Round 5/i)).toBeInTheDocument();
  });

  it('renders standing bids with slot names', () => {
    render(<AuctionHUD event={mockEvent} slots={mockSlots} />);
    expect(screen.getByText(/Piccadilly Circus/i)).toBeInTheDocument();
    expect(screen.getByText(/£150/i)).toBeInTheDocument();
  });

  it('renders agent remaining budgets', () => {
    render(<AuctionHUD event={mockEvent} slots={mockSlots} />);
    expect(screen.getByText(/£5,000/i)).toBeInTheDocument();
  });

  it('renders nothing when event is null', () => {
    const { container } = render(<AuctionHUD event={null} slots={mockSlots} />);
    expect(container.firstChild).toBeNull();
  });
});