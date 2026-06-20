import { AgentScorecard, AuctionEvent, Bid } from '../core/model';
import { ClearingResult } from '../core/clearing';

export type ExplainingField = 'surplus' | 'overpayment' | 'leftOnTable' | null;

/**
 * Extracts relevant auction events to explain a specific scorecard metric.
 * 
 * @param field - The metric to explain.
 * @param scorecard - The agent's scorecard data.
 * @param clearingResults - The map of all slot clearing results.
 * @returns An array of AuctionEvents that justify the metric value.
 */
export function getEvidenceEvents(
  field: ExplainingField,
  scorecard: AgentScorecard,
  clearingResults: Record<string, ClearingResult>
): AuctionEvent[] {
  if (!field || !clearingResults) return [];

  const relevantEvents: AuctionEvent[] = [];
  const resultsArray = Object.values(clearingResults);

  for (const res of resultsArray) {
    const isWinner = res.winner?.id === scorecard.agentId;

    if (field === 'surplus' && isWinner) {
      // For surplus, show the agent's successful bids
      res.auditTrail.forEach(e => {
        if ('amount' in e && e.agentId === scorecard.agentId) {
          relevantEvents.push(e);
        }
      });
    } else if (field === 'overpayment' && isWinner) {
      // For overpayment, show the last dropout (the price setter) and the final bid
      const dropouts = res.auditTrail.filter(e => 'priceAtDropOut' in e);
      if (dropouts.length > 0) {
        relevantEvents.push(dropouts[dropouts.length - 1]);
      }
      const bids = res.auditTrail.filter((e): e is Bid => 'amount' in e);
      const finalBid = bids.findLast(b => b.agentId === scorecard.agentId);
      if (finalBid) {
        relevantEvents.push(finalBid);
      }
    } else if (field === 'leftOnTable') {
      // Show when the agent dropped out of a slot they didn't win
      const myDropout = res.auditTrail.find(e => 
        'priceAtDropOut' in e && e.agentId === scorecard.agentId
      );
      if (myDropout) {
        relevantEvents.push(myDropout);
      }
    }
  }

  return relevantEvents;
}