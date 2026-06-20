import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAdvertiserAgent, createBillboardSlot } from '../core/model';
import { ClaudeAgentRuntime } from './claude_agent';
import { AuctionState } from './types';

describe('ClaudeAgentRuntime', () => {
  const mockAgent = createAdvertiserAgent({
    id: 'claude-1',
    budget: 500,
    trueValuation: { 'slot-a': 300 }
  });

  const mockState: AuctionState = {
    round: 1,
    standingBids: { 'slot-a': 100 },
    slots: [
      createBillboardSlot({ id: 'slot-a', name: 'Slot A', basePrice: 50, bidIncrement: 10 })
    ]
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    // Mock import.meta.env
    vi.stubGlobal('import', { meta: { env: { VITE_ANTHROPIC_API_KEY: 'test-key' } } });
  });

  it('should parse a valid JSON response from Claude', async () => {
    const mockApiResponse = {
      content: [{
        text: JSON.stringify([{ slotId: 'slot-a', action: 'raise', amount: 150 }])
      }]
    };

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse
    });

    const runtime = new ClaudeAgentRuntime(mockAgent, { apiKey: 'test-key' });
    const decisions = await runtime.getDecisions(mockState);

    expect(decisions).toHaveLength(1);
    expect(decisions[0]).toMatchObject({
      slotId: 'slot-a',
      action: 'raise',
      amount: 150
    });
  });

  it('should fallback to "hold" if the API returns malformed JSON', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ text: 'I decided to bid 200 on slot A' }] })
    });

    const runtime = new ClaudeAgentRuntime(mockAgent, { apiKey: 'test-key' });
    const decisions = await runtime.getDecisions(mockState);

    expect(decisions[0].action).toBe('hold');
  });

  it('should enforce budget even on Claude responses', async () => {
    // Claude attempts to bid 600, which exceeds budget of 500
    const mockApiResponse = {
      content: [{
        text: JSON.stringify([{ slotId: 'slot-a', action: 'raise', amount: 600 }])
      }]
    };

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse
    });

    const runtime = new ClaudeAgentRuntime(mockAgent, { apiKey: 'test-key' });
    const decisions = await runtime.getDecisions(mockState);

    expect(decisions[0].action).toBe('drop');
  });

  it('should fail if no API key is provided or found in environment', () => {
    vi.stubGlobal('import', { meta: { env: {} } });
    expect(() => new ClaudeAgentRuntime(mockAgent, { apiKey: '' })).toThrow(/Missing API key/);
  });
});