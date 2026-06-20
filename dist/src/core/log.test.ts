import { describe, it, expect, beforeEach } from 'vitest';
import { AuctionLog } from './log.js';
import { createBillboardSlot, createBid, createDropOut } from './model.js';

describe('AuctionLog', () => {
  let log: AuctionLog;
  const slotA = createBillboardSlot({ id: 'A', name: 'Slot A', basePrice: 100, bidIncrement: 10 });
  const slotB = createBillboardSlot({ id: 'B', name: 'Slot B', basePrice: 50, bidIncrement: 5 });

  beforeEach(() => {
    log = new AuctionLog();
  });

  it('should maintain global insertion order', () => {
    const b1 = createBid({ agentId: 'ag1', slotId: 'A', round: 1, amount: 110 });
    const d1 = createDropOut({ agentId: 'ag2', slotId: 'A', round: 1, priceAtDropOut: 110 });
    
    log.appendBid(b1);
    log.appendDropOut(d1);
    
    const events = log.getAllEvents();
    expect(events).toHaveLength(2);
    expect((events[0] as any).amount).toBe(110);
    expect((events[1] as any).priceAtDropOut).toBe(110);
  });

  it('should filter events by slot', () => {
    log.appendBid(createBid({ agentId: 'ag1', slotId: 'A', round: 1, amount: 110 }));
    log.appendBid(createBid({ agentId: 'ag1', slotId: 'B', round: 1, amount: 60 }));
    
    const eventsA = log.getEventsForSlot('A');
    expect(eventsA).toHaveLength(1);
    expect(eventsA[0].slotId).toBe('A');
  });

  it('should calculate standing bid correctly', () => {
    // No bids yet
    expect(log.getStandingBid(slotA)).toBe(100);

    // After bids
    log.appendBid(createBid({ agentId: 'ag1', slotId: 'A', round: 1, amount: 110 }));
    log.appendBid(createBid({ agentId: 'ag2', slotId: 'A', round: 2, amount: 120 }));
    
    expect(log.getStandingBid(slotA)).toBe(120);
  });

  it('should track active agents', () => {
    log.appendBid(createBid({ agentId: 'ag1', slotId: 'A', round: 1, amount: 110 }));
    log.appendBid(createBid({ agentId: 'ag2', slotId: 'A', round: 1, amount: 110 }));
    
    expect(log.getActiveAgents('A')).toContain('ag1');
    expect(log.getActiveAgents('A')).toContain('ag2');

    log.appendDropOut(createDropOut({ agentId: 'ag1', slotId: 'A', round: 2, priceAtDropOut: 120 }));
    
    const active = log.getActiveAgents('A');
    expect(active).not.toContain('ag1');
    expect(active).toContain('ag2');
  });

  it('should return frozen copies to prevent mutation', () => {
    log.appendBid(createBid({ agentId: 'ag1', slotId: 'A', round: 1, amount: 110 }));
    const events = log.getAllEvents();
    
    expect(() => {
      (events as any).push({});
    }).toThrow();
  });
});