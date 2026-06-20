import { describe, it, expect } from 'vitest';
import { 
  createBillboardSlot, 
  createAdvertiserAgent, 
  createBid, 
  createDropOut 
} from './model.js';

describe('Domain Model Constructors', () => {
  describe('BillboardSlot', () => {
    it('should create a valid slot', () => {
      const slot = createBillboardSlot({
        id: 'slot-1',
        name: 'Main St Entrance',
        basePrice: 100,
        bidIncrement: 10
      });
      expect(slot.id).toBe('slot-1');
    });

    it('should throw on empty ID', () => {
      expect(() => createBillboardSlot({
        id: '',
        name: 'Label',
        basePrice: 10,
        bidIncrement: 5
      })).toThrow(/id must be a non-empty string/);
    });

    it('should throw on negative basePrice', () => {
      expect(() => createBillboardSlot({
        id: 'id',
        name: 'Label',
        basePrice: -1,
        bidIncrement: 5
      })).toThrow(/basePrice must be a non-negative integer/);
    });

    it('should throw on bidIncrement less than 1', () => {
      expect(() => createBillboardSlot({
        id: 'id',
        name: 'Label',
        basePrice: 10,
        bidIncrement: 0
      })).toThrow(/bidIncrement must be an integer of 1 or more/);
    });
  });

  describe('AdvertiserAgent', () => {
    it('should create a valid agent', () => {
      const agent = createAdvertiserAgent({
        id: 'agent-1',
        budget: 5000,
        trueValuation: { 'slot-1': 200 }
      });
      expect(agent.budget).toBe(5000);
      expect(agent.trueValuation['slot-1']).toBe(200);
    });

    it('should throw on negative budget', () => {
      expect(() => createAdvertiserAgent({
        id: 'agent-1',
        budget: -50,
        trueValuation: {}
      })).toThrow(/budget must be a non-negative integer/);
    });

    it('should throw on empty ID', () => {
      expect(() => createAdvertiserAgent({
        id: ' ',
        budget: 100,
        trueValuation: {}
      })).toThrow(/id must be a non-empty string/);
    });
  });

  describe('Bid', () => {
    it('should create a valid bid', () => {
      const bid = createBid({
        agentId: 'a1',
        slotId: 's1',
        round: 1,
        amount: 150
      });
      expect(bid.amount).toBe(150);
    });

    it('should throw on negative round or amount', () => {
      expect(() => createBid({ agentId: 'a', slotId: 's', round: -1, amount: 10 }))
        .toThrow(/round must be a non-negative integer/);
      expect(() => createBid({ agentId: 'a', slotId: 's', round: 1, amount: -10 }))
        .toThrow(/amount must be a non-negative integer/);
    });
  });

  describe('DropOut', () => {
    it('should create a valid dropout', () => {
      const drop = createDropOut({
        agentId: 'a1',
        slotId: 's1',
        round: 5,
        priceAtDropOut: 300
      });
      expect(drop.priceAtDropOut).toBe(300);
    });
  });
});