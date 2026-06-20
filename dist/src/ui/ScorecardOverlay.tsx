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
      bottom: '20px',
      width: '320px',
      maxHeight: '60vh',
      overflowY: 'auto',
      zIndex: 20,
      paddingRight: '10px' // Space for scrollbar
    }}>
      {Object.values(scorecards).map(card => (
        <ScorecardPanel 
          key={card.agentId} 
          scorecard={card} 
          clearingResults={clearingResults || {}}
        />
      ))}
    </div>
  );
};

export default ScorecardOverlay;