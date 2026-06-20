import { 
  BillboardSlot, 
  AdvertiserAgent, 
  AgentScorecard, 
  DropOut 
} from './model.js';
import { AuctionLog } from './log.js';
import { ClearingResult } from './clearing.js';

/**
 * Referee computes FairPrice per slot and AgentScorecards.
 */
export class Referee {
  /**
   * Computes the FairPrice for a specific slot.
   */
  computeFairPrice(result: ClearingResult): number {
    const { slot, auditTrail, winner } = result;

    if (!winner) {
      return slot.basePrice;
    }

    // Identify all dropout events for this slot
    const dropOuts = auditTrail
      .filter((e): e is DropOut => 'priceAtDropOut' in e)
      .sort((a, b) => a.round - b.round);

    if (dropOuts.length === 0) {
      // Uncontested slot: FairPrice is the clearingPrice (basePrice)
      return result.clearingPrice ?? slot.basePrice;
    }

    // Contested slot: FairPrice is the priceAtDropOut of the last agent to leave
    const lastDropOut = dropOuts[dropOuts.length - 1];
    return lastDropOut.priceAtDropOut;
  }

  /**
   * Computes scorecards for all agents based on auction results.
   */
  computeScorecards(
    agents: readonly AdvertiserAgent[],
    clearingResults: Record<string, ClearingResult>
  ): Record<string, AgentScorecard> {
    const scorecards: Record<string, AgentScorecard> = {};

    for (const agent of agents) {
      let surplusCaptured = 0;
      let overpayment = 0;
      let leftOnTable = 0;
      const concessionErrors: ConcessionError[] = [];

      for (const result of Object.values(clearingResults)) {
        const valuation = agent.trueValuation[result.slot.id] ?? 0;
        const audit = result.auditTrail;

        // 1. Detect Overbid-while-uncontested
        const agentBids = audit.filter(e => 'amount' in e && e.agentId === agent.id);
        for (let i = 1; i < agentBids.length; i++) {
          const currentBid = agentBids[i];
          const previousEventIndex = audit.indexOf(currentBid) - 1;
          
          // Check if anyone else was active or bid between this agent's bids
          const activeOthers = audit.slice(0, audit.indexOf(currentBid)).reduce((acc, e) => {
            if ('amount' in e) acc.add(e.agentId);
            if ('priceAtDropOut' in e) acc.delete(e.agentId);
            return acc;
          }, new Set<string>());
          activeOthers.delete(agent.id);

          if (activeOthers.size === 0) {
            concessionErrors.push({
              agentId: agent.id,
              slotId: result.slot.id,
              round: currentBid.round,
              type: 'overbid-while-uncontested',
              reason: `Agent ${agent.id} raised bid to £${(currentBid as any).amount} while already the sole bidder for slot ${result.slot.id}.`
            });
          }
        }

        if (result.winner?.id === agent.id) {
          const price = result.clearingPrice ?? 0;
          const fairPrice = this.computeFairPrice(result);

          surplusCaptured += (valuation - price);
          overpayment += Math.max(0, price - fairPrice);
        } else {
          // Check for drop-out to calculate leftOnTable and Premature Drop
          const dropOutEvent = audit.find(
            (e): e is DropOut => 'priceAtDropOut' in e && e.agentId === agent.id
          );

          if (dropOutEvent) {
            const diff = valuation - dropOutEvent.priceAtDropOut;
            const minNextBid = dropOutEvent.priceAtDropOut + result.slot.bidIncrement;
            if (diff > 0 && agent.budget >= minNextBid) {
              leftOnTable += diff;
              concessionErrors.push({
                agentId: agent.id,
                slotId: result.slot.id,
                round: dropOutEvent.round,
                type: 'premature-drop',
                reason: `Agent ${agent.id} had a valuation of £${valuation} but dropped out at £${dropOutEvent.priceAtDropOut} while having sufficient budget.`
              });
            }
          }
        }
      }

      scorecards[agent.id] = Object.freeze({
        agentId: agent.id,
        surplusCaptured,
        overpayment,
        leftOnTable,
        concessionErrors: Object.freeze(concessionErrors),
      });
    }

    return Object.freeze(scorecards);
  }
}