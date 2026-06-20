import { 
  BillboardSlot, 
  AdvertiserAgent, 
  AuctionViolation, 
  Bid, 
  DropOut 
} from './model.js';
import { AuctionLog } from './log.js';

export class AuctionValidator {
  /**
   * Validates an AuctionLog against business rules.
   * Returns an array of violations. If empty, the log is valid.
   */
  validate(
    log: AuctionLog, 
    slots: BillboardSlot[], 
    agents: AdvertiserAgent[]
  ): AuctionViolation[] {
    const violations: AuctionViolation[] = [];
    const events = log.getAllEvents();

    const slotMap = new Map(slots.map(s => [s.id, s]));
    const agentMap = new Map(agents.map(a => [a.id, a]));

    // Tracking state per slot
    const standingBids = new Map<string, number>();
    const droppedOutAgents = new Map<string, Set<string>>();

    for (const event of events) {
      const slot = slotMap.get(event.slotId);
      const agent = agentMap.get(event.agentId);

      if (!slot) {
        violations.push({
          event,
          agentId: event.agentId,
          slotId: event.slotId,
          reason: `Slot "${event.slotId}" not found in provided slots list.`
        });
        continue;
      }

      if (!agent) {
        violations.push({
          event,
          agentId: event.agentId,
          slotId: event.slotId,
          reason: `Agent "${event.agentId}" not found in provided agents list.`
        });
        continue;
      }

      const currentStanding = standingBids.get(slot.id);
      const droppedSet = droppedOutAgents.get(slot.id) || new Set<string>();

      if ('amount' in event) {
        // BID VALIDATION
        const bid = event as Bid;

        // Rule: Agent must not place a Bid after dropping out
        if (droppedSet.has(bid.agentId)) {
          violations.push({
            event: bid,
            agentId: bid.agentId,
            slotId: bid.slotId,
            reason: `Agent "${bid.agentId}" placed a bid after dropping out of slot "${bid.slotId}".`
          });
        }

        // Rule: Bid amount must not exceed agent's budget
        if (bid.amount > agent.budget) {
          violations.push({
            event: bid,
            agentId: bid.agentId,
            slotId: bid.slotId,
            reason: `Bid amount £${bid.amount} exceeds agent budget of £${agent.budget}.`
          });
        }

        // Rule: Increment and Base Price logic
        if (currentStanding === undefined) {
          // First Bid
          if (bid.amount < slot.basePrice) {
            violations.push({
              event: bid,
              agentId: bid.agentId,
              slotId: bid.slotId,
              reason: `First bid £${bid.amount} is below slot base price £${slot.basePrice}.`
            });
          }
        } else {
          // Subsequent Bids
          const minRequired = currentStanding + slot.bidIncrement;
          if (bid.amount < minRequired) {
            violations.push({
              event: bid,
              agentId: bid.agentId,
              slotId: bid.slotId,
              reason: `Bid £${bid.amount} is below required minimum of £${minRequired} (standing £${currentStanding} + increment £${slot.bidIncrement}).`
            });
          }
        }

        // Update state if valid or not, to track sequence progression
        standingBids.set(slot.id, Math.max(currentStanding ?? 0, bid.amount));

      } else {
        // DROPOUT VALIDATION
        const drop = event as DropOut;
        const effectiveStanding = currentStanding ?? slot.basePrice;

        // Rule: DropOut priceAtDropOut must equal the standing bid
        if (drop.priceAtDropOut !== effectiveStanding) {
          violations.push({
            event: drop,
            agentId: drop.agentId,
            slotId: drop.slotId,
            reason: `Dropout price £${drop.priceAtDropOut} does not match current standing bid £${effectiveStanding}.`
          });
        }

        // Mark as dropped out
        droppedSet.add(drop.agentId);
        droppedOutAgents.set(slot.id, droppedSet);
      }
    }

    return violations;
  }
}