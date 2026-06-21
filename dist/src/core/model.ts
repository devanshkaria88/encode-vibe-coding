/**
 * Represents a single piece of billboard inventory.
 */
export interface BillboardSlot {
  readonly id: string;
  readonly name: string;
  readonly basePrice: number;
  readonly bidIncrement: number;
}

/**
 * Represents a participant in the auction.
 */
export interface AdvertiserAgent {
  readonly id: string;
  readonly budget: number;
  /**
   * Private mapping from slot ID to the amount it is worth to the agent.
   * This is intended for scoring paths only.
   */
  readonly trueValuation: Readonly<Record<string, number>>;
}

/**
 * AuctionViolation represents a rule breach found by the validator.
 */
export interface AuctionViolation {
  readonly event: AuctionEvent;
  readonly agentId: string;
  readonly slotId: string;
  readonly reason: string;
}

/**
 * AuctionEvent is a single entry in the auction record — either a Bid or a DropOut.
 * Defined here for type-safety in constructors if needed, though logically part of log.
 */
export type AuctionEvent = Bid | DropOut;

/**
 * Represents a specific bid action.
 */
export interface Bid {
  readonly agentId: string;
  readonly slotId: string;
  readonly round: number;
  readonly amount: number;
}

/**
 * Represents an agent dropping out of a specific slot's auction.
 */
export interface DropOut {
  readonly agentId: string;
  readonly slotId: string;
  readonly round: number;
  readonly priceAtDropOut: number;
}

/**
 * A flagged sub-optimal action by an AdvertiserAgent.
 */
export interface ConcessionError {
  readonly agentId: string;
  readonly slotId: string;
  readonly round: number;
  readonly type: 'overbid-while-uncontested' | 'premature-drop';
  readonly reason: string;
}

/**
 * The per-agent report containing performance metrics.
 */
export interface AgentScorecard {
  readonly agentId: string;
  readonly surplusCaptured: number;
  readonly overpayment: number;
  readonly leftOnTable: number;
  readonly concessionErrors: readonly ConcessionError[];
}

/**
 * Validation and Construction Logic
 */

export function createBillboardSlot(data: BillboardSlot): BillboardSlot {
  if (!data.id || data.id.trim() === "") {
    throw new Error(`Invalid BillboardSlot: id must be a non-empty string. Provided: "${data.id}"`);
  }
  if (!data.name || data.name.trim() === "") {
    throw new Error(`Invalid BillboardSlot: name must be a non-empty string. Provided: "${data.name}"`);
  }
  if (!Number.isInteger(data.basePrice) || data.basePrice < 0) {
    throw new Error(`Invalid BillboardSlot: basePrice must be a non-negative integer. Provided: ${data.basePrice}`);
  }
  if (!Number.isInteger(data.bidIncrement) || data.bidIncrement < 1) {
    throw new Error(`Invalid BillboardSlot: bidIncrement must be an integer of 1 or more. Provided: ${data.bidIncrement}`);
  }
  return Object.freeze({ ...data });
}

export function createAdvertiserAgent(data: AdvertiserAgent): AdvertiserAgent {
  if (!data.id || data.id.trim() === "") {
    throw new Error(`Invalid AdvertiserAgent: id must be a non-empty string. Provided: "${data.id}"`);
  }
  if (!Number.isInteger(data.budget) || data.budget < 0) {
    throw new Error(`Invalid AdvertiserAgent: budget must be a non-negative integer. Provided: ${data.budget}`);
  }
  // Validate valuation entries are whole numbers
  for (const [slotId, value] of Object.entries(data.trueValuation)) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`Invalid AdvertiserAgent: trueValuation for slot "${slotId}" must be a non-negative integer. Provided: ${value}`);
    }
  }
  return Object.freeze({ 
    ...data, 
    trueValuation: Object.freeze({ ...data.trueValuation }) 
  });
}

export function createBid(data: Bid): Bid {
  if (!data.agentId) throw new Error("Invalid Bid: agentId is required");
  if (!data.slotId) throw new Error("Invalid Bid: slotId is required");
  if (!Number.isInteger(data.round) || data.round < 0) {
    throw new Error(`Invalid Bid: round must be a non-negative integer. Provided: ${data.round}`);
  }
  if (!Number.isInteger(data.amount) || data.amount < 0) {
    throw new Error(`Invalid Bid: amount must be a non-negative integer. Provided: ${data.amount}`);
  }
  return Object.freeze({ ...data });
}

export function createDropOut(data: DropOut): DropOut {
  if (!data.agentId) throw new Error("Invalid DropOut: agentId is required");
  if (!data.slotId) throw new Error("Invalid DropOut: slotId is required");
  if (!Number.isInteger(data.round) || data.round < 0) {
    throw new Error(`Invalid DropOut: round must be a non-negative integer. Provided: ${data.round}`);
  }
  if (!Number.isInteger(data.priceAtDropOut) || data.priceAtDropOut < 0) {
    throw new Error(`Invalid DropOut: priceAtDropOut must be a non-negative integer. Provided: ${data.priceAtDropOut}`);
  }
  return Object.freeze({ ...data });
}

/**
 * Type guard to check if an AuctionEvent is a Bid.
 */
export function isBid(event: AuctionEvent): event is Bid {
  return 'amount' in event;
}