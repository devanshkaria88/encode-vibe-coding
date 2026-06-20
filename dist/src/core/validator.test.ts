import { describe, it, expect, beforeEach } from 'vitest';
import { AuctionValidator } from './validator.js';
import { AuctionLog } from './log.js';
import { 
  createBillboardSlot, 
  createAdvertiserAgent, 
  createBid, 
  createDropOut 
} from './model.js';

describe('AuctionValidator', () => {
  let validator: AuctionValidator;
  let slot = createBillboardSlot({ id: 's1', name: 'Slot 1', basePrice: 100, bidIncrement: 10 });
  let agent = createAdvertiserAgent({ id: 'a1', budget: 500, trueValuation: { 's1': 400 } });

  beforeEach(() => {
    validator = new AuctionValidator();
  });

  it('should accept a valid sequence of bids', () => {
    const log = new AuctionLog();
    log.appendBid(createBid({ agentId: 'a1', slotId: 's1', round: 1, amount: 100 }));
    log.appendBid(createBid({ agentId: 'a2', slotId: 's1', round: 2, amount: 110 }));
    
    const agent2 = createAdvertiserAgent({ id: 'a2', budget: 1000, trueValuation: {} });
    const violations = validator.validate(log, [slot], [agent, agent2]);
    expect(violations).toHaveLength(0);
  });

  it('should flag first bid below base price', () => {
    const log = new AuctionLog();
    log.appendBid(createBid({ agentId: 'a1', slotId: 's1', round: 1, amount: 90 }));
    
    const violations = validator.validate(log, [slot], [agent]);
    expect(violations[0].reason).toContain('below slot base price');
  });

  it('should flag bid below minimum increment', () => {
    const log = new AuctionLog();
    log.appendBid(createBid({ agentId: 'a1', slotId: 's1', round: 1, amount: 100 }));
    log.appendBid(createBid({ agentId: 'a2', slotId: 's1', round: 2, amount: 105 })); // Increment is 10
    
    const agent2 = createAdvertiserAgent({ id: 'a2', budget: 1000, trueValuation: {} });
    const violations = validator.validate(log, [slot], [agent, agent2]);
    expect(violations[0].reason).toContain('below required minimum');
  });

  it('should flag bid exceeding agent budget', () => {
    const log = new AuctionLog();
    log.appendBid(createBid({ agentId: 'a1', slotId: 's1', round: 1, amount: 600 }));
    
    const violations = validator.validate(log, [slot], [agent]);
    expect(violations[0].reason).toContain('exceeds agent budget');
  });

  it('should flag bid after dropout', () => {
    const log = new AuctionLog();
    log.appendBid(createBid({ agentId: 'a1', slotId: 's1', round: 1, amount: 100 }));
    log.appendDropOut(createDropOut({ agentId: 'a1', slotId: 's1', round: 2, priceAtDropOut: 100 }));
    log.appendBid(createBid({ agentId: 'a1', slotId: 's1', round: 3, amount: 120 }));
    
    const violations = validator.validate(log, [slot], [agent]);
    expect(violations[0].reason).toContain('after dropping out');
  });

  it('should flag dropout with incorrect price', () => {
    const log = new AuctionLog();
    log.appendBid(createBid({ agentId: 'a1', slotId: 's1', round: 1, amount: 150 }));
    log.appendDropOut(createDropOut({ agentId: 'a2', slotId: 's1', round: 2, priceAtDropOut: 100 })); // Should be 150
    
    const agent2 = createAdvertiserAgent({ id: 'a2', budget: 1000, trueValuation: {} });
    const violations = validator.validate(log, [slot], [agent, agent2]);
    expect(violations[0].reason).toContain('does not match current standing bid');
  });
});