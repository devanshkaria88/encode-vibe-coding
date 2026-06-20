import { 
  BillboardSlot, 
  AuctionLog, 
  ClearingEngine, 
  Referee, 
  Bid, 
  DropOut,
  createBid,
  createDropOut
} from '../core/index';
import { AgentRuntime, AuctionState, BidDecision } from '../agents/types';
import { AuctionOutcome, RoundEvent } from './types';
import { RoundStream } from './stream';

/**
 * ArenaOrchestrator drives the auction process to completion.
 */
export class ArenaOrchestrator {
  private log: AuctionLog;
  private round: number = 0;
  private contenders: Map<string, Set<string>> = new Map(); // slotId -> Set of agentIds
  private leaders: Map<string, string | null> = new Map(); // slotId -> agentId or null

  constructor(
    private readonly slots: readonly BillboardSlot[],
    private readonly runtimes: readonly AgentRuntime[],
    private readonly stream?: RoundStream
  ) {
    this.log = new AuctionLog();
    // Initially, everyone is a contender for every slot.
    for (const slot of slots) {
      this.contenders.set(slot.id, new Set(runtimes.map(r => r.agent.id)));
      this.leaders.set(slot.id, null);
    }
  }

  /**
   * Runs the auction until all slots have cleared.
   * @param onRoundEnd Optional listener called after each completed round.
   */
  async runAuction(onRoundEnd?: (event: RoundEvent) => void): Promise<AuctionOutcome> {
    const totalSlots = this.slots.length;

    while (this.getClearedCount() < totalSlots) {
      this.round++;
      let activityThisRound = false;
      const bidsThisRound: Bid[] = [];

      for (const runtime of this.runtimes) {
        const agentId = runtime.agent.id;
        
        // Prepare live state for this agent
        const currentState: AuctionState = {
          round: this.round,
          slots: this.slots,
          standingBids: this.getStandingBidsMap()
        };

        const decisions = await runtime.getDecisions(currentState);

        for (const decision of decisions) {
          if (this.isSlotCleared(decision.slotId)) continue;
          
          const slotContenders = this.contenders.get(decision.slotId)!;
          if (!slotContenders.has(agentId)) continue;

          // The current leader takes no action.
          if (this.leaders.get(decision.slotId) === agentId) continue;

          if (decision.action === 'raise' && decision.amount !== undefined) {
            const bid: Bid = createBid({
              agentId,
              slotId: decision.slotId,
              round: this.round,
              amount: decision.amount
            });
            this.log.appendBid(bid);
            bidsThisRound.push(bid);
            this.leaders.set(decision.slotId, agentId);
            activityThisRound = true;
          } else if (decision.action === 'drop') {
            const dropout: DropOut = createDropOut({
              agentId,
              slotId: decision.slotId,
              round: this.round,
              priceAtDropOut: currentState.standingBids[decision.slotId]
            });
            this.log.appendDropOut(dropout);
            slotContenders.delete(agentId);
            activityThisRound = true;
          }
          // 'hold' keeps them in slotContenders but performs no action.
        }
      }

      // Check for stalls on contested slots
      if (!activityThisRound) {
        this.resolveStalls();
      }

      // Emit round event
      const event = this.captureRoundEvent(bidsThisRound);
      if (this.stream) {
        await this.stream.push(event);
      }
      if (onRoundEnd) {
        onRoundEnd(event);
      }
    }

    // Wrap up results using arbiter-core
    const engine = new ClearingEngine();
    const referee = new Referee();
    const agents = this.runtimes.map(r => r.agent);
    
    const clearingResults = engine.clearAllSlots(this.slots, this.log, agents);
    const scorecards = referee.computeScorecards(agents, clearingResults);

    return {
      slots: this.slots,
      log: this.log,
      clearingResults,
      scorecards
    };
  }

  private getClearedCount(): number {
    let count = 0;
    for (const slot of this.slots) {
      if (this.isSlotCleared(slot.id)) count++;
    }
    return count;
  }

  private isSlotCleared(slotId: string): boolean {
    const contenders = this.contenders.get(slotId);
    if (!contenders) return true;
    if (contenders.size === 0) return true;
    if (contenders.size === 1) {
      // A slot is cleared when exactly one contender remains AND they have placed an opening bid.
      return this.leaders.get(slotId) !== null;
    }
    return false;
  }

  private getStandingBidsMap(): Record<string, number> {
    const map: Record<string, number> = {};
    for (const slot of this.slots) {
      map[slot.id] = this.log.getStandingBid(slot);
    }
    return map;
  }

  /**
   * If a round completes with no raises or drops on any contested slot,
   * we resolve those slots immediately.
   * A slot is contested while two or more contenders remain on it.
   */
  private resolveStalls(): void {
    for (const slot of this.slots) {
      const contenders = this.contenders.get(slot.id)!;
      
      // Only resolve stalls on contested slots (2 or more contenders)
      if (contenders.size <= 1) continue;

      const leader = this.leaders.get(slot.id);
      const currentPrice = this.log.getStandingBid(slot);

      // Every contender who is NOT the leader must drop out now.
      for (const agentId of Array.from(contenders)) {
        if (agentId !== leader) {
          this.log.appendDropOut(createDropOut({
            agentId,
            slotId: slot.id,
            round: this.round,
            priceAtDropOut: currentPrice
          }));
          contenders.delete(agentId);
        }
      }
    }
  }

  /**
   * Captures the current state of the auction as a RoundEvent.
   */
  private captureRoundEvent(bids: Bid[]): RoundEvent {
    const standingBids = this.getStandingBidsMap();
    const dropOuts: Record<string, string[]> = {};
    const remainingBudgets: Record<string, number> = {};

    for (const slot of this.slots) {
      const slotEvents = this.log.getEventsForSlot(slot.id);
      dropOuts[slot.id] = slotEvents
        .filter((e): e is DropOut => 'priceAtDropOut' in e)
        .map(e => e.agentId);
    }

    for (const runtime of this.runtimes) {
      const agentId = runtime.agent.id;
      const initialBudget = runtime.agent.budget;
      
      // Calculate spent: sum of current highest bids where agent is leader
      let spent = 0;
      for (const slot of this.slots) {
        if (this.leaders.get(slot.id) === agentId) {
          spent += standingBids[slot.id];
        }
      }
      remainingBudgets[agentId] = Math.max(0, initialBudget - spent);
    }

    return {
      round: this.round,
      standingBids,
      bids,
      dropOuts,
      remainingBudgets
    };
  }
}