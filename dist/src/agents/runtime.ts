import { AdvertiserAgent } from '../core/model';
import { AgentRuntime, AuctionState, BidDecision } from './types';

/**
 * Enforcement logic to ensure agents never bid over their budget.
 */
export function enforceBudget(
  agent: AdvertiserAgent,
  decisions: BidDecision[],
  standingBids: Record<string, number>
): BidDecision[] {
  let committedBudget = 0;

  return decisions.map((decision) => {
    if (decision.action === 'drop') {
      return decision;
    }

    // A 'hold' means the agent is staying at the price they previously committed to.
    // However, for the orchestrator's perspective, we calculate based on the 
    // standing bid they are currently winning or the new raise amount.
    const price = decision.action === 'raise' 
      ? (decision.amount ?? 0) 
      : (standingBids[decision.slotId] ?? 0);

    if (committedBudget + price > agent.budget) {
      return {
        slotId: decision.slotId,
        action: 'drop',
        reason: `Budget exceeded: requested ${price}, total would be ${committedBudget + price}, but budget is ${agent.budget}`
      } as any; // Extension for debugging/logging
    }

    committedBudget += price;
    return decision;
  });
}

/**
 * Deterministic bidding strategy logic.
 * If leader: hold.
 * Else if (standing bid + increment) <= valuation AND <= remaining budget: raise by increment.
 * Else: drop.
 */
export const deterministicStrategy = (state: AuctionState, agent: AdvertiserAgent): BidDecision[] => {
  return state.slots.map(slot => {
    const standingBid = state.standingBids[slot.id] || 0;
    
    // Check if agent is already the leader (simplification: if they placed the standing bid)
    // In a real round, the orchestrator tracks the leader, but for the decision contract:
    const isLeader = state.leaders?.[slot.id] === agent.id;
    
    if (isLeader) {
      return { slotId: slot.id, action: 'hold' };
    }

    const nextBid = standingBid === 0 ? slot.basePrice : standingBid + slot.bidIncrement;
    const valuation = agent.trueValuation[slot.id] || 0;

    if (nextBid <= valuation) {
      return { slotId: slot.id, action: 'raise', amount: nextBid };
    }

    return { slotId: slot.id, action: 'drop' };
  });
};

/**
 * A deterministic implementation of AgentRuntime for testing purposes and fallback.
 */
export class DeterministicAgentRuntime implements AgentRuntime {
  constructor(
    public readonly agent: AdvertiserAgent,
    private readonly strategy: (state: AuctionState, agent: AdvertiserAgent) => BidDecision[]
  ) {}

  getDecisions(state: AuctionState): BidDecision[] {
    const rawDecisions = this.strategy(state, this.agent);
    return enforceBudget(this.agent, rawDecisions, state.standingBids);
  }
}