import React from 'react';
import { BillboardSlot } from '../core/index';
import { RoundEvent } from '../arena/types';

interface AuctionHUDProps {
  readonly event: RoundEvent | null;
  readonly slots: readonly BillboardSlot[];
}

const AuctionHUD: React.FC<AuctionHUDProps> = ({ event, slots }) => {
  if (!event) return null;

  const getSlotLabel = (id: string) => {
    const slot = slots.find(s => s.id === id);
    if (slot) return slot.name;
    return `Slot...${id.slice(-4)}`;
  };

  const standingBidEntries = Object.entries(event.standingBids)
    .sort(([, a], [, b]) => b - a);
  
  const topBids = standingBidEntries.slice(0, 5);
  const remainingCount = Math.max(0, standingBidEntries.length - 5);
  const totalContested = standingBidEntries.length;

  return (
    <div 
      data-testid="auction-hud"
      style={{
      position: 'absolute',
      top: '220px',
      right: '20px',
      width: '280px',
      maxHeight: '400px',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px',
      borderRadius: '16px',
      background: 'rgba(15, 15, 25, 0.2)',
      backdropFilter: 'blur(8px) saturate(180%)',
      WebkitBackdropFilter: 'blur(8px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
      color: '#fff',
      zIndex: 100,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Round {event.round}</h2>
        <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{totalContested} Contested</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '12px' }}>
        {topBids.map(([slotId, amount]) => (
          <div key={slotId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>{getSlotLabel(slotId)}</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#10b981' }}>£{amount.toLocaleString()}</span>
          </div>
        ))}
        {remainingCount > 0 && (
          <div style={{ fontSize: '0.75rem', opacity: 0.5, fontStyle: 'italic' }}>
            + {remainingCount} more slots
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {Object.entries(event.remainingBudgets).map(([agentId, budget]) => (
            <div key={agentId} style={{ fontSize: '0.7rem' }}>
              <div style={{ opacity: 0.6, fontSize: '0.6rem', textTransform: 'uppercase' }}>{agentId}</div>
              <div style={{ fontWeight: 'bold' }}>£{budget.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AuctionHUD;