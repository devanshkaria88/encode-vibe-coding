import { AdvertiserAgent } from '../core/model';
import { AgentRuntime } from './types';
import { ClaudeAgentRuntime } from './claude_agent';
import { DeterministicAgentRuntime, deterministicStrategy } from './runtime';

/**
 * Selects the appropriate AgentRuntime based on environment configuration.
 * Returns Claude-backed runtime if API key is present, otherwise returns deterministic.
 */
export function createAgentRuntime(agent: AdvertiserAgent): AgentRuntime {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

  if (apiKey && apiKey.trim().length > 0) {
    return new ClaudeAgentRuntime(agent, {
      apiKey: apiKey,
      model: 'claude-sonnet-4-6'
    });
  }

  return new DeterministicAgentRuntime(agent, deterministicStrategy);
}