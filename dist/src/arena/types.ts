import { BillboardSlot, AuctionLog, ClearingResult, AgentScorecard } from '../core/index';

/**
 * A streamed snapshot of one round.
 */
import { Bid } from '../core/model';

/**
 * A streamed snapshot of one round.
 */
export interface RoundEvent {
  readonly round: number;
  readonly standingBids: Record<string, number>;
  readonly bids: readonly Bid[];
  readonly dropOuts: Record<string, string[]>; // slotId -> agentIds
  readonly remainingBudgets: Record<string, number>;
}

/**
 * The final output of the Arena Orchestrator execution.
 */
export interface AuctionOutcome {
  readonly slots: readonly BillboardSlot[];
  readonly log: AuctionLog;
  readonly clearingResults: Record<string, ClearingResult>;
  readonly scorecards: Record<string, AgentScorecard>;
}