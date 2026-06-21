import React from 'react';
import { AgentScorecard } from '../core/model';
import { ClearingResult } from '../core/clearing';
import ScorecardPanel from './ScorecardPanel';

interface ScorecardOverlayProps {
  readonly scorecards: Record<string, AgentScorecard> | undefined;
  readonly clearingResults: Record<string, ClearingResult> | undefined;
}

/**
 * Overlay container for the vertical stack of ScorecardPanels.
 */
const ScorecardOverlay: React.FC<ScorecardOverlayProps> = ({ scorecards, clearingResults }) => {
  if (!scorecards) return null;

  return (
    <div style={{
      position: 'absolute',
      left: '20px',
      right: '20px',
      bottom: '20px',
      display: 'flex',
      flexDirection: 'row',
      gap: '16px',
      justifyContent: 'space-around',
      zIndex: 20,
      pointerEvents: 'none' // Allow map interaction between cards
    }}>
      {Object.values(scorecards).map(card => (
        <div key={card.agentId} style={{ flex: 1, maxWidth: '400px', pointerEvents: 'auto' }}>
          <ScorecardPanel 
            scorecard={card} 
            clearingResults={clearingResults || {}}
          />
        </div>
      ))}
    </div>
  );
};

export default ScorecardOverlay;