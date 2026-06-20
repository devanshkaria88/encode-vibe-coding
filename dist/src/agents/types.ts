import { BillboardSlot, AdvertiserAgent } from '../core/model';

/**
 * Represents the choice an agent makes for a specific slot in a round.
 */
export type BidAction = 'raise' | 'hold' | 'drop';

export interface BidDecision {
  readonly slotId: string;
  readonly action: BidAction;
  readonly amount?: number; // Required if action is 'raise'
}

/**
 * The public view of the auction available to agents.
 */
export interface AuctionState {
  readonly round: number;
  readonly standingBids: Readonly<Record<string, number>>; // slotId -> current price
  readonly slots: readonly BillboardSlot[];
}

/**
 * The interface for a runtime that wraps an agent and makes decisions.
 * Supports both sync (deterministic) and async (LLM) implementations.
 */
export interface AgentRuntime {
  readonly agent: AdvertiserAgent;
  getDecisions(state: AuctionState): BidDecision[] | Promise<BidDecision[]>;
}