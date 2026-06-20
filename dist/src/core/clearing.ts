import { BillboardSlot, AdvertiserAgent, AuctionEvent, Bid } from './model.js';
import { AuctionLog } from './log.js';

/**
 * The outcome for a single BillboardSlot.
 */
export interface ClearingResult {
  readonly slot: BillboardSlot;
  readonly winner?: AdvertiserAgent;
  readonly clearingPrice?: number;
  readonly auditTrail: readonly AuctionEvent[];
}

/**
 * ClearingEngine turns a validated AuctionLog and a set of BillboardSlot items 
 * into one ClearingResult per slot.
 */
export class ClearingEngine {
  /**
   * Clears all provided slots using the log and available agents.
   * Returns a mapping from slot ID to the clearing result.
   */
  clearAllSlots(
    slots: readonly BillboardSlot[],
    log: AuctionLog,
    agents: AdvertiserAgent[]
  ): Record<string, ClearingResult> {
    const results: Record<string, ClearingResult> = {};
    for (const slot of slots) {
      results[slot.id] = this.clearSlot(slot, log, agents);
    }
    return Object.freeze(results);
  }

  /**
   * Clears a single slot based on the provided log and agents.
   */
  clearSlot(slot: BillboardSlot, log: AuctionLog, agents: AdvertiserAgent[]): ClearingResult {
    const auditTrail = log.getEventsForSlot(slot.id);
    
    // Identify all agents who ever participated (placed at least one bid)
    const participants = new Set<string>();
    for (const event of auditTrail) {
      if ('amount' in event) {
        participants.add(event.agentId);
      }
    }

    // Identify agents who dropped out
    const dropouts = new Set<string>();
    for (const event of auditTrail) {
      if ('priceAtDropOut' in event) {
        dropouts.add(event.agentId);
      }
    }

    // The winner is the participant who never dropped out
    const winnerIds = Array.from(participants).filter(id => !dropouts.has(id));
    
    if (winnerIds.length === 0) {
      return Object.freeze({
        slot,
        auditTrail,
      });
    }

    // Rules state only one winner should remain in a valid log
    const winnerId = winnerIds[0];
    const winner = agents.find(a => a.id === winnerId);

    if (!winner) {
      throw new Error(`ClearingEngine Error: Winner agent "${winnerId}" not found in provided agents list for slot "${slot.id}".`);
    }

    let clearingPrice: number;
    if (participants.size === 1) {
      // Uncontested slot clears at base price
      clearingPrice = slot.basePrice;
    } else {
      // Contested slot clears at final standing bid
      const bids = auditTrail.filter((e): e is Bid => 'amount' in e);
      clearingPrice = bids.length > 0 ? Math.max(...bids.map(b => b.amount)) : slot.basePrice;
    }

    return Object.freeze({
      slot,
      winner,
      clearingPrice,
      auditTrail,
    });
  }
}