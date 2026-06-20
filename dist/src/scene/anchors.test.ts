import { describe, it, expect } from 'vitest';
import { AGENT_ANCHORS, AGENT_COLORS } from './anchors';

describe('Agent Visualization Constants', () => {
  it('defines anchors for exactly 4 agents', () => {
    const keys = Object.keys(AGENT_ANCHORS);
    expect(keys).toHaveLength(4);
    expect(keys).toContain('agent-1');
  });

  it('provides RGB colors for each agent', () => {
    Object.values(AGENT_COLORS).forEach(color => {
      expect(color).toHaveLength(3);
      expect(color[0]).toBeGreaterThanOrEqual(0);
      expect(color[0]).toBeLessThanOrEqual(255);
    });
  });
});