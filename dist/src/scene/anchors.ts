import { AgentAnchor } from './types';

/**
 * Fixed positions for the 4 default advertiser agents.
 * Positions are placed around the London bounding box.
 */
export const AGENT_ANCHORS: Record<string, AgentAnchor> = {
  'agent-1': { agentId: 'agent-1', lat: 51.3, lon: -0.1 },
  'agent-2': { agentId: 'agent-2', lat: 51.7, lon: -0.1 },
  'agent-3': { agentId: 'agent-3', lat: 51.5, lon: -0.5 },
  'agent-4': { agentId: 'agent-4', lat: 51.5, lon: 0.3 }
};

export const AGENT_COLORS: Record<string, [number, number, number]> = {
  'agent-1': [59, 130, 246], // Blue
  'agent-2': [16, 185, 129], // Green
  'agent-3': [245, 158, 11], // Amber
  'agent-4': [239, 68, 68]   // Red
};