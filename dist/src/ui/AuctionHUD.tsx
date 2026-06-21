import React from 'react';
import { BillboardSlot } from '../core/index';
import { RoundEvent } from '../arena/types';

interface AuctionHUDProps {
  readonly event: RoundEvent | null;
  readonly slots: readonly BillboardSlot[];
}

/**
 * AuctionHUD: The round ticker overlay.
 * Displays current round, standing bids for slots, and agent budgets.
 * Uses glassmorphism styling.
 */
const AuctionHUD: React.FC<AuctionHUDProps> = ({ event, slots }) => {
  if (!event) return null;

  const getSlotName = (id: string) => slots.find(s => s.id === id)?.name || id;

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      width: '300px',
      maxHeight: '80vh',
      overflowY: 'auto',
      padding: '20px',
      borderRadius: '16px',
      background: 'rgba(15, 15, 25, 0.25)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
      color: '#fff',
      zIndex: 100,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Round {event.round}</h2>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.6, marginBottom: '8px' }}>Standing Bids</h3>
        {Object.entries(event.standingBids).map(([slotId, amount]) => (
          <div key={slotId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.9rem' }}>{getSlotName(slotId)}</span>
            <span style={{ fontWeight: 'bold', color: '#10b981' }}>£{amount.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div>
        <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.6, marginBottom: '8px' }}>Agent Budgets</h3>
        {Object.entries(event.remainingBudgets).map(([agentId, budget]) => (
          <div key={agentId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            {/* 
              FIX: Removed the fixed .slice(0, 4) truncation which caused collisions (e.g., 'agent-alpha' vs 'agent-beta').
              Instead, we show the full ID or a more descriptive label to ensure uniqueness.
            */}
            <span style={{ fontSize: '0.9rem' }}>Agent {agentId}</span>
            <span style={{ fontWeight: 'bold' }}>£{budget.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AuctionHUD;