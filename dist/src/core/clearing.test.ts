import { describe, it, expect } from 'vitest';
import { BillboardSlot, AdvertiserAgent, createBillboardSlot, createAdvertiserAgent, createBid, createDropOut } from './model.js';
import { AuctionLog } from './log.js';
import { ClearingEngine } from './clearing.js';

describe('ClearingEngine', () => {
  const slot: BillboardSlot = createBillboardSlot({
    id: 'slot-1',
    name: 'Main St',
    basePrice: 100,
    bidIncrement: 10
  });

  const agentA: AdvertiserAgent = createAdvertiserAgent({
    id: 'agent-a',
    budget: 1000,
    trueValuation: { 'slot-1': 500 }
  });

  const agentB: AdvertiserAgent = createAdvertiserAgent({
    id: 'agent-b',
    budget: 1000,
    trueValuation: { 'slot-1': 400 }
  });

  const engine = new ClearingEngine();

  it('clears with no winner if no bids were placed', () => {
    const log = new AuctionLog();
    const result = engine.clearSlot(slot, log, [agentA, agentB]);

    expect(result.winner).toBeUndefined();
    expect(result.clearingPrice).toBeUndefined();
    expect(result.auditTrail).toHaveLength(0);
  });

  it('clears at basePrice for an uncontested slot even if agent bid higher', () => {
    const log = new AuctionLog();
    log.appendBid(createBid({ agentId: 'agent-a', slotId: 'slot-1', round: 1, amount: 150 }));
    
    const result = engine.clearSlot(slot, log, [agentA]);

    expect(result.winner?.id).toBe('agent-a');
    expect(result.clearingPrice).toBe(100); // basePrice
  });

  it('clears at final standing bid for a contested slot', () => {
    const log = new AuctionLog();
    log.appendBid(createBid({ agentId: 'agent-a', slotId: 'slot-1', round: 1, amount: 110 }));
    log.appendBid(createBid({ agentId: 'agent-b', slotId: 'slot-1', round: 2, amount: 120 }));
    log.appendDropOut(createDropOut({ agentId: 'agent-a', slotId: 'slot-1', round: 3, priceAtDropOut: 120 }));
    
    const result = engine.clearSlot(slot, log, [agentA, agentB]);

    expect(result.winner?.id).toBe('agent-b');
    expect(result.clearingPrice).toBe(120);
    expect(result.auditTrail).toHaveLength(3);
  });

  it('throws error if winner is not in the agents list', () => {
    const log = new AuctionLog();
    log.appendBid(createBid({ agentId: 'agent-unknown', slotId: 'slot-1', round: 1, amount: 110 }));
    
    expect(() => engine.clearSlot(slot, log, [agentA])).toThrow(/Winner agent "agent-unknown" not found/);
  });

  it('clears multiple slots at once using clearAllSlots', () => {
    const slot2 = createBillboardSlot({
      id: 'slot-2',
      name: 'Side St',
      basePrice: 50,
      bidIncrement: 5
    });

    const log = new AuctionLog();
    // Agent A bids on slot 1
    log.appendBid(createBid({ agentId: 'agent-a', slotId: 'slot-1', round: 1, amount: 110 }));
    // Agent B bids on slot 2
    log.appendBid(createBid({ agentId: 'agent-b', slotId: 'slot-2', round: 1, amount: 60 }));

    const results = engine.clearAllSlots([slot, slot2], log, [agentA, agentB]);

    expect(results['slot-1']).toBeDefined();
    expect(results['slot-2']).toBeDefined();
    
    // Slot 1: Uncontested, clears at base price 100
    expect(results['slot-1'].winner?.id).toBe('agent-a');
    expect(results['slot-1'].clearingPrice).toBe(100);

    // Slot 2: Uncontested, clears at base price 50
    expect(results['slot-2'].winner?.id).toBe('agent-b');
    expect(results['slot-2'].clearingPrice).toBe(50);
  });
});