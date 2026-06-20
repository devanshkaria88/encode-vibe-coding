import React, { useState } from 'react';
import { AgentScorecard, AuctionEvent } from '../core/model';
import { ClearingResult } from '../core/clearing';
import { AGENT_COLORS } from '../scene/anchors';
import { ExplainingField, getEvidenceEvents } from './scorecardUtils';

interface ScorecardPanelProps {
  readonly scorecard: AgentScorecard;
  readonly clearingResults?: Record<string, ClearingResult>;
}

/**
 * :ScorecardPanel:
 * Displays an individual agent's auction performance results.
 * Includes "click-to-explain" functionality for metric transparency.
 */
const ScorecardPanel: React.FC<ScorecardPanelProps> = ({ scorecard, clearingResults }) => {
  const [explanation, setExplanation] = useState<{ field: ExplainingField; events: AuctionEvent[] }>({ field: null, events: [] });
  const color = AGENT_COLORS[scorecard.agentId] || [255, 255, 255];
  const rgb = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;

  const handleExplain = (field: ExplainingField) => {
    if (explanation.field === field) {
      setExplanation({ field: null, events: [] });
      return;
    }

    const relevantEvents = getEvidenceEvents(field, scorecard, clearingResults);
    setExplanation({ field, events: relevantEvents });
  };

  const clickableStyle: React.CSSProperties = {
    cursor: 'pointer',
    borderBottom: '1px dashed rgba(255,255,255,0.3)',
    transition: 'opacity 0.2s'
  };

  return (
    <div style={{
      padding: '20px',
      borderRadius: '12px',
      background: 'rgba(20, 20, 30, 0.75)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderLeft: `4px solid ${rgb}`,
      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      borderRight: '1px solid rgba(255, 255, 255, 0.1)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
      color: '#fff',
      marginBottom: '16px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: rgb }}>
        Agent {scorecard.agentId}
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div onClick={() => handleExplain('surplus')} style={clickableStyle}>
          <div style={{ fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase' }}>Surplus ⓘ</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>£{scorecard.surplusCaptured.toLocaleString()}</div>
        </div>
        <div onClick={() => handleExplain('overpayment')} style={clickableStyle}>
          <div style={{ fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase' }}>Overpaid ⓘ</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>£{scorecard.overpayment.toLocaleString()}</div>
        </div>
        <div onClick={() => handleExplain('leftOnTable')} style={{ ...clickableStyle, gridColumn: 'span 2' }}>
          <div style={{ fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase' }}>Left on Table ⓘ</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: scorecard.leftOnTable > 0 ? '#fbbf24' : '#fff' }}>
            £{scorecard.leftOnTable.toLocaleString()}
          </div>
        </div>
      </div>

      {explanation.field && (
        <div style={{ 
          margin: '12px 0', 
          padding: '10px', 
          background: 'rgba(255,255,255,0.05)', 
          borderRadius: '6px',
          fontSize: '0.75rem',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#93c5fd' }}>
            Evidence for {explanation.field}:
          </div>
          {explanation.events.length === 0 ? (
            <div style={{ opacity: 0.5 }}>No events recorded for this metric.</div>
          ) : (
            explanation.events.map((ev, i) => (
              <div key={i} style={{ marginBottom: '4px' }}>
                Round {ev.round}: {ev.agentId} {'amount' in ev ? `Bid £${ev.amount}` : `Dropped at £${ev.priceAtDropOut}`}
              </div>
            ))
          )}
        </div>
      )}

      {scorecard.concessionErrors.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
          <div style={{ fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase', marginBottom: '8px' }}>Flagged Actions</div>
          {scorecard.concessionErrors.map((error, idx) => (
            <div key={idx} style={{ fontSize: '0.8rem', marginBottom: '6px', lineHeight: '1.4', background: 'rgba(239, 68, 68, 0.1)', padding: '6px', borderRadius: '4px' }}>
              <strong>{error.type === 'premature-drop' ? 'Premature Drop' : 'Inefficient Bid'}:</strong> {error.reason}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScorecardPanel;