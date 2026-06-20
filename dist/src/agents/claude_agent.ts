import { AdvertiserAgent } from '../core/model';
import { AgentRuntime, AuctionState, BidDecision } from './types';
import { enforceBudget } from './runtime';

/**
 * Implementation of AgentRuntime that uses the Claude API to make bidding decisions.
 */
export class ClaudeAgentRuntime implements AgentRuntime {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(
    public readonly agent: AdvertiserAgent,
    options: { apiKey?: string; model?: string } = {}
  ) {
    this.apiKey = options.apiKey || (import.meta.env.VITE_ANTHROPIC_API_KEY as string);
    this.model = options.model || 'claude-sonnet-4-6';

    if (!this.apiKey) {
      throw new Error(`ClaudeAgentRuntime: Missing API key for agent ${agent.id}`);
    }
  }

  /**
   * Generates a private prompt for the agent.
   */
  private constructPrompt(state: AuctionState): string {
    const valuationList = Object.entries(this.agent.trueValuation)
      .map(([id, val]) => `- Slot ${id}: worth £${val} to you.`)
      .join('\n');

    const standingBids = Object.entries(state.standingBids)
      .map(([id, price]) => `- Slot ${id}: current standing bid £${price}`)
      .join('\n');

    return `
You are an AI advertising agent (ID: ${this.agent.id}) participating in a multi-unit auction.
Your goal is to maximize the value you capture (True Valuation - Price Paid) while staying within your total budget.

GOAL: Maximize surplus across all slots.
YOUR TOTAL BUDGET: £${this.agent.budget}

YOUR PRIVATE VALUATIONS:
${valuationList}

CURRENT AUCTION STATE (Round ${state.round}):
${standingBids}

RULES:
1. You can 'raise' the bid on a slot, 'hold' your current position, or 'drop' from a slot.
2. If you 'raise', you must provide a new 'amount'.
3. Your total committed bids (the sum of prices for all slots you are active in) MUST NOT exceed £${this.agent.budget}.
4. If you have dropped out of a slot in a previous round, you cannot re-enter.

Return your decision as a valid JSON array of objects with this structure:
[
  { "slotId": "string", "action": "raise" | "hold" | "drop", "amount": number },
  ...
]

Only return the JSON. No preamble.
    `.trim();
  }

  async getDecisions(state: AuctionState): Promise<BidDecision[]> {
    const prompt = this.constructPrompt(state);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Claude API error (${response.status}): ${errorBody}`);
      }

      const data = await response.json();
      const text = data.content[0].text;
      const rawDecisions = this.parseResponse(text, state);
      
      return enforceBudget(this.agent, rawDecisions, state.standingBids);
    } catch (error) {
      console.error(`ClaudeAgentRuntime [${this.agent.id}] error:`, error);
      // Fallback: Hold on all slots if the API fails or returns junk
      return state.slots.map(slot => ({
        slotId: slot.id,
        action: 'hold'
      }));
    }
  }

  private parseResponse(text: string, state: AuctionState): BidDecision[] {
    try {
      // Find JSON array in the text in case Claude adds conversational filler
      const match = text.match(/\[\s*{[\s\S]*}\s*\]/);
      if (!match) throw new Error('No JSON array found in response');
      
      const parsed = JSON.parse(match[0]) as BidDecision[];
      
      // Ensure every slot in the state has a decision
      return state.slots.map(slot => {
        const found = parsed.find(d => d.slotId === slot.id);
        return found || { slotId: slot.id, action: 'hold' };
      });
    } catch (e) {
      console.warn(`Failed to parse Claude response for agent ${this.agent.id}: ${e}`);
      return state.slots.map(slot => ({ slotId: slot.id, action: 'hold' }));
    }
  }
}