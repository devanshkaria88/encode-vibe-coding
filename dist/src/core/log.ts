import { Bid, DropOut, BillboardSlot } from './model.js';

/**
 * AuctionEvent is a single entry in the auction record.
 */
export type AuctionEvent = Bid | DropOut;

/**
 * AuctionLog is an ordered, append-only record of every AuctionEvent.
 */
export class AuctionLog {
  private readonly events: AuctionEvent[] = [];

  /**
   * Appends a Bid to the log.
   */
  appendBid(bid: Bid): void {
    this.events.push(Object.freeze({ ...bid }));
  }

  /**
   * Appends a DropOut to the log.
   */
  appendDropOut(dropOut: DropOut): void {
    this.events.push(Object.freeze({ ...dropOut }));
  }

  /**
   * Returns all events in the log in order.
   */
  getAllEvents(): readonly AuctionEvent[] {
    return Object.freeze([...this.events]);
  }

  /**
   * Returns all AuctionEvent items for a given slot, in global order.
   */
  getEventsForSlot(slotId: string): readonly AuctionEvent[] {
    if (!slotId) {
      throw new Error("AuctionLog.getEventsForSlot: slotId is required.");
    }
    return Object.freeze(this.events.filter(e => e.slotId === slotId));
  }

  /**
   * Returns the current standing bid of a slot.
   * It is the highest Bid amount seen so far on that slot, or the basePrice.
   */
  getStandingBid(slot: BillboardSlot): number {
    if (!slot || !slot.id) {
      throw new Error("AuctionLog.getStandingBid: valid BillboardSlot is required.");
    }
    
    const bids = this.events.filter((e): e is Bid => 
      'amount' in e && e.slotId === slot.id
    ) as Bid[];

    const amounts = bids.map(b => b.amount);
    return Math.max(slot.basePrice, ...amounts);
  }

  /**
   * Returns the IDs of active agents for a slot.
   * Active agents have bid on the slot and have not yet dropped out of it.
   */
  getActiveAgents(slotId: string): readonly string[] {
    if (!slotId) {
      throw new Error("AuctionLog.getActiveAgents: slotId is required.");
    }

    const slotEvents = this.getEventsForSlot(slotId);
    const bidders = new Set<string>();
    const dropouts = new Set<string>();

    for (const event of slotEvents) {
      if ('amount' in event) {
        bidders.add(event.agentId);
      } else if ('priceAtDropOut' in event) {
        dropouts.add(event.agentId);
      }
    }

    const active = Array.from(bidders).filter(agentId => !dropouts.has(agentId));
    return Object.freeze(active);
  }
}