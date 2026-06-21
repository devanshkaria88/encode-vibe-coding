import React, { useState } from 'react';
import { AgentScorecard, AuctionEvent, isBid } from '../core/model';
import { ClearingResult } from '../core/clearing';
import { AGENT_COLORS } from '../scene/anchors';
import { ExplainingField, getEvidenceEvents } from './scorecardUtils';

interface ScorecardPanelProps {
  readonly scorecard: AgentScorecard;
  readonly clearingResults?: Record<string, ClearingResult>;
}

const ScorecardPanel: React.FC<ScorecardPanelProps> = ({ scorecard, clearingResults }) => {
  const [explanation, setExplanation] = useState<{ field: ExplainingField; events: AuctionEvent[] }>({ field: null, events: [] });

  // Group identical concession errors
  const groupedErrors = scorecard.concessionErrors.reduce((acc, err) => {
    const key = `${err.type}-${err.reason}`;
    if (!acc[key]) {
      acc[key] = { ...err, count: 1 };
    } else {
      acc[key].count++;
    }
    return acc;
  }, {} as Record<string, typeof scorecard.concessionErrors[0] & { count: number }>);
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

  return (
    <div 
      data-testid={`scorecard-${scorecard.agentId}`}
      style={{
      padding: '16px',
      borderRadius: '16px',
      background: 'rgba(15, 15, 25, 0.2)',
      backdropFilter: 'blur(8px) saturate(180%)',
      WebkitBackdropFilter: 'blur(8px) saturate(180%)',
      borderLeft: `4px solid ${rgb}`,
      borderTop: '1px solid rgba(255, 255, 255, 0.15)',
      borderRight: '1px solid rgba(255, 255, 255, 0.15)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
      color: '#fff',
      height: '180px',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      boxSizing: 'border-box'
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: rgb, fontWeight: 700 }}>
        Agent {scorecard.agentId}
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div onClick={() => handleExplain('surplus')} style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: '0.7rem', opacity: 0.6, fontWeight: 600 }}>SURPLUS ⓘ</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>£{scorecard.surplusCaptured.toLocaleString()}</div>
        </div>
        <div onClick={() => handleExplain('overpayment')} style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: '0.7rem', opacity: 0.6, fontWeight: 600 }}>OVERPAID ⓘ</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>£{scorecard.overpayment.toLocaleString()}</div>
        </div>
        <div onClick={() => handleExplain('leftOnTable')} style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: '0.7rem', opacity: 0.6, fontWeight: 600 }}>LEFT ON TABLE ⓘ</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>£{scorecard.leftOnTable.toLocaleString()}</div>
        </div>
      </div>

      {scorecard.concessionErrors.length > 0 && (
        <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px', overflowY: 'auto' }}>
          {Object.values(groupedErrors).map((err, i) => (
            <div key={i} style={{ marginBottom: '4px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#fbbf24' }}>
                {`${err.type === 'premature-drop' ? 'Premature Drop' : 'Overbid'}${err.count > 1 ? ` ×${err.count}` : ''}:`}
              </div>
              <div style={{ fontSize: '0.7rem', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {err.reason}
              </div>
            </div>
          ))}
        </div>
      )}

      {explanation.field && (
        <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '12px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '8px' }}>
            Evidence for {explanation.field}
          </div>
          <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
            {explanation.events.map((ev, i) => (
              <div key={i} style={{ fontSize: '0.7rem', opacity: 0.8, marginBottom: '4px' }}>
                Round {ev.round}: {ev.agentId} {isBid(ev) ? `Bid £${ev.amount}` : `Dropped at £${ev.priceAtDropOut}`}
              </div>
            ))}
            {explanation.events.length === 0 && (
              <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>No events found for this metric.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScorecardPanel;