import { describe, it, expect } from 'vitest';
import { Referee } from './referee.js';
import { 
  createBillboardSlot, 
  createAdvertiserAgent, 
  createBid, 
  createDropOut,
  BillboardSlot,
  AdvertiserAgent
} from './model.js';
import { ClearingResult } from './clearing.js';

describe('Referee', () => {
  const referee = new Referee();

  const slot: BillboardSlot = createBillboardSlot({
    id: 'slot-1',
    name: 'Main St',
    basePrice: 100,
    bidIncrement: 10
  });

  const agent: AdvertiserAgent = createAdvertiserAgent({
    id: 'agent-1',
    budget: 1000,
    trueValuation: { 'slot-1': 500 }
  });

  it('computes FairPrice for an uncontested slot (basePrice)', () => {
    const result: ClearingResult = {
      slot,
      winner: agent,
      clearingPrice: 100,
      auditTrail: [
        createBid({ agentId: 'agent-1', slotId: 'slot-1', round: 1, amount: 150 })
      ]
    };

    expect(referee.computeFairPrice(result)).toBe(100);
  });

  it('computes FairPrice for a contested slot (last dropout price)', () => {
    const result: ClearingResult = {
      slot,
      winner: agent,
      clearingPrice: 200,
      auditTrail: [
        createBid({ agentId: 'agent-1', slotId: 'slot-1', round: 1, amount: 110 }),
        createBid({ agentId: 'agent-2', slotId: 'slot-1', round: 2, amount: 150 }),
        createBid({ agentId: 'agent-1', slotId: 'slot-1', round: 3, amount: 200 }),
        createDropOut({ agentId: 'agent-2', slotId: 'slot-1', round: 4, priceAtDropOut: 180 })
      ]
    };

    expect(referee.computeFairPrice(result)).toBe(180);
  });

  it('calculates overpayment as clearingPrice - FairPrice', () => {
    const result: ClearingResult = {
      slot,
      winner: agent,
      clearingPrice: 200,
      auditTrail: [
        createBid({ agentId: 'agent-1', slotId: 'slot-1', round: 1, amount: 200 }),
        createDropOut({ agentId: 'agent-2', slotId: 'slot-1', round: 2, priceAtDropOut: 150 })
      ]
    };

    const scorecards = referee.computeScorecards([agent], { 'slot-1': result });
    
    // clearingPrice (200) - FairPrice (150) = 50
    expect(scorecards[agent.id].overpayment).toBe(50);
    // valuation (500) - clearingPrice (200) = 300
    expect(scorecards[agent.id].surplusCaptured).toBe(300);
  });

  it('calculates leftOnTable when agent drops out with valuation > price and remaining budget', () => {
    const agent2 = createAdvertiserAgent({
      id: 'agent-2',
      budget: 1000,
      trueValuation: { 'slot-1': 400 }
    });

    const result: ClearingResult = {
      slot,
      winner: agent,
      clearingPrice: 200,
      auditTrail: [
        createBid({ agentId: 'agent-1', slotId: 'slot-1', round: 1, amount: 150 }),
        createBid({ agentId: 'agent-2', slotId: 'slot-1', round: 2, amount: 180 }),
        createBid({ agentId: 'agent-1', slotId: 'slot-1', round: 3, amount: 200 }),
        createDropOut({ agentId: 'agent-2', slotId: 'slot-1', round: 4, priceAtDropOut: 200 })
      ]
    };

    const scorecards = referee.computeScorecards([agent2], { 'slot-1': result });
    
    // valuation (400) - priceAtDropOut (200) = 200
    expect(scorecards['agent-2'].leftOnTable).toBe(200);
  });

  it('calculates zero leftOnTable if agent budget was exhausted at dropout', () => {
    const agentLowBudget = createAdvertiserAgent({
      id: 'agent-low',
      budget: 190, // Cannot afford the standing bid of 200
      trueValuation: { 'slot-1': 400 }
    });

    const result: ClearingResult = {
      slot,
      winner: agent,
      clearingPrice: 200,
      auditTrail: [
        createBid({ agentId: 'agent-1', slotId: 'slot-1', round: 1, amount: 200 }),
        createDropOut({ agentId: 'agent-low', slotId: 'slot-1', round: 2, priceAtDropOut: 200 })
      ]
    };

    const scorecards = referee.computeScorecards([agentLowBudget], { 'slot-1': result });
    expect(scorecards['agent-low'].leftOnTable).toBe(0);
  });

  it('calculates zero leftOnTable if valuation is less than price at dropout', () => {
    const agentCheap = createAdvertiserAgent({
      id: 'agent-cheap',
      budget: 1000,
      trueValuation: { 'slot-1': 150 }
    });

    const result: ClearingResult = {
      slot,
      winner: agent,
      clearingPrice: 200,
      auditTrail: [
        createBid({ agentId: 'agent-1', slotId: 'slot-1', round: 1, amount: 200 }),
        createDropOut({ agentId: 'agent-cheap', slotId: 'slot-1', round: 2, priceAtDropOut: 200 })
      ]
    };

    const scorecards = referee.computeScorecards([agentCheap], { 'slot-1': result });
    expect(scorecards['agent-cheap'].leftOnTable).toBe(0);
  });

  it('flags overbid-while-uncontested when an agent outbids themselves with no competition', () => {
    const result: ClearingResult = {
      slot,
      winner: agent,
      clearingPrice: 100, // Uncontested clears at base
      auditTrail: [
        createBid({ agentId: 'agent-1', slotId: 'slot-1', round: 1, amount: 110 }),
        createBid({ agentId: 'agent-1', slotId: 'slot-1', round: 2, amount: 150 })
      ]
    };

    const scorecards = referee.computeScorecards([agent], { 'slot-1': result });
    const errors = scorecards[agent.id].concessionErrors;
    
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe('overbid-while-uncontested');
    expect(errors[0].reason).toContain('raised bid to £150');
  });

  it('flags premature-drop with a descriptive reason', () => {
    const agent2 = createAdvertiserAgent({
      id: 'agent-2',
      budget: 1000,
      trueValuation: { 'slot-1': 400 }
    });

    const result: ClearingResult = {
      slot,
      winner: agent,
      clearingPrice: 200,
      auditTrail: [
        createBid({ agentId: 'agent-1', slotId: 'slot-1', round: 1, amount: 200 }),
        createDropOut({ agentId: 'agent-2', slotId: 'slot-1', round: 2, priceAtDropOut: 200 })
      ]
    };

    const scorecards = referee.computeScorecards([agent2], { 'slot-1': result });
    const errors = scorecards['agent-2'].concessionErrors;

    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe('premature-drop');
    expect(errors[0].reason).toBe('Agent agent-2 had a valuation of £400 but dropped out at £200 while having sufficient budget.');
  });
});