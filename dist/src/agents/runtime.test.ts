import { describe, it, expect } from 'vitest';
import { createAdvertiserAgent, createBillboardSlot } from '../core/model';
import { DeterministicAgentRuntime, enforceBudget, deterministicStrategy } from './runtime';
import { AuctionState, BidDecision } from './types';

describe('AgentRuntime Budget Enforcement', () => {
  const mockAgent = createAdvertiserAgent({
    id: 'agent-1',
    budget: 100,
    trueValuation: { 's1': 150, 's2': 150 }
  });

  it('should allow decisions within budget', () => {
    const decisions: BidDecision[] = [
      { slotId: 's1', action: 'raise', amount: 60 }
    ];
    const standingBids = { 's1': 50 };
    
    const result = enforceBudget(mockAgent, decisions, standingBids);
    expect(result[0].action).toBe('raise');
    expect(result[0].amount).toBe(60);
  });

  it('should downgrade raise to drop if single bid exceeds budget', () => {
    const decisions: BidDecision[] = [
      { slotId: 's1', action: 'raise', amount: 110 }
    ];
    const standingBids = { 's1': 50 };
    
    const result = enforceBudget(mockAgent, decisions, standingBids);
    expect(result[0].action).toBe('drop');
  });

  it('should downgrade subsequent bids if cumulative total exceeds budget', () => {
    const decisions: BidDecision[] = [
      { slotId: 's1', action: 'raise', amount: 60 },
      { slotId: 's2', action: 'raise', amount: 50 } // 60 + 50 = 110 > 100
    ];
    const standingBids = { 's1': 50, 's2': 40 };
    
    const result = enforceBudget(mockAgent, decisions, standingBids);
    expect(result[0].action).toBe('raise');
    expect(result[1].action).toBe('drop');
  });

  it('should handle "hold" actions within budget calculations', () => {
    const decisions: BidDecision[] = [
      { slotId: 's1', action: 'hold' },
      { slotId: 's2', action: 'raise', amount: 60 }
    ];
    // Standing bid for s1 is 50. Total 50 + 60 = 110 > 100.
    const standingBids = { 's1': 50, 's2': 40 };
    
    const result = enforceBudget(mockAgent, decisions, standingBids);
    expect(result[0].action).toBe('hold');
    expect(result[1].action).toBe('drop');
  });
});

describe('DeterministicAgentRuntime', () => {
  it('should execute the provided strategy then enforce budget', () => {
    const agent = createAdvertiserAgent({ id: 'a', budget: 10, trueValuation: {} });
    const runtime = new DeterministicAgentRuntime(agent, () => [
      { slotId: 's1', action: 'raise', amount: 20 }
    ]);

    const state: AuctionState = {
      round: 1,
      standingBids: { 's1': 5 },
      slots: []
    };

    const decisions = runtime.getDecisions(state);
    expect(decisions[0].action).toBe('drop');
  });
});

describe('deterministicStrategy', () => {
  const agent = createAdvertiserAgent({
    id: 'a1',
    budget: 500,
    trueValuation: { 's1': 100 }
  });

  const slot = createBillboardSlot({ 
    id: 's1', 
    name: 'Slot 1', 
    basePrice: 50, 
    bidIncrement: 10 
  });

  it('should hold if the agent is the leader', () => {
    const state: AuctionState = {
      round: 2,
      standingBids: { 's1': 60 },
      leaders: { 's1': 'a1' },
      slots: [slot]
    };
    const decisions = deterministicStrategy(state, agent);
    expect(decisions[0].action).toBe('hold');
  });

  it('should raise by one increment if below valuation', () => {
    const state: AuctionState = {
      round: 2,
      standingBids: { 's1': 60 },
      leaders: { 's1': 'other' },
      slots: [slot]
    };
    const decisions = deterministicStrategy(state, agent);
    expect(decisions[0]).toMatchObject({ action: 'raise', amount: 70 });
  });

  it('should drop if next increment exceeds valuation', () => {
    const state: AuctionState = {
      round: 2,
      standingBids: { 's1': 100 },
      leaders: { 's1': 'other' },
      slots: [slot]
    };
    const decisions = deterministicStrategy(state, agent);
    expect(decisions[0].action).toBe('drop');
  });
});