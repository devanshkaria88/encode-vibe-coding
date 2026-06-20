import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAgentRuntime } from './selector';
import { createAdvertiserAgent } from '../core/model';
import { ClaudeAgentRuntime } from './claude_agent';
import { DeterministicAgentRuntime } from './runtime';

describe('createAgentRuntime Selector', () => {
  const mockAgent = createAdvertiserAgent({
    id: 'test-agent',
    budget: 1000,
    trueValuation: {}
  });

  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('should return ClaudeAgentRuntime when VITE_ANTHROPIC_API_KEY is set', () => {
    vi.stubEnv('VITE_ANTHROPIC_API_KEY', 'sk-ant-123');
    
    const runtime = createAgentRuntime(mockAgent);
    expect(runtime).toBeInstanceOf(ClaudeAgentRuntime);
  });

  it('should return DeterministicAgentRuntime when API key is missing', () => {
    vi.stubEnv('VITE_ANTHROPIC_API_KEY', '');
    
    const runtime = createAgentRuntime(mockAgent);
    expect(runtime).toBeInstanceOf(DeterministicAgentRuntime);
  });
});