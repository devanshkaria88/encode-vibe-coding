import { Bid } from '../core/model';

/**
 * Represents a fixed position on the map assigned to one AdvertiserAgent.
 */
export interface AgentAnchor {
  readonly agentId: string;
  readonly lat: number;
  readonly lon: number;
}

/**
 * Visual state for a pulse effect on a slot.
 */
export interface PulseState {
  readonly slotId: string;
  readonly startTime: number;
}

/**
 * A short-lived deck.gl arc drawn from a bidding agent's AgentAnchor to the slot.
 */
export interface BidEdge extends Bid {
  readonly startLat: number;
  readonly startLon: number;
  readonly endLat: number;
  readonly endLon: number;
  readonly timestamp: number;
}