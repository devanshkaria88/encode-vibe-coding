import React, { useState, useCallback } from 'react';
import LondonMapScene from './scene/LondonMapScene';
import AuctionHUD from './ui/AuctionHUD';
import ScorecardOverlay from './ui/ScorecardOverlay';
import { RoundEvent, AuctionOutcome } from './arena/types';
import { BillboardSlot, AdvertiserAgent, Bid } from './core/index';
import { fetchInventory } from './inventory/source';
import { createAgentRuntime } from './agents/selector';
import { ArenaOrchestrator } from './arena/orchestrator';
import { SpatialBillboardSlot } from './inventory/types';

const MAX_AUCTION_SLOTS = 24;
const CENTRAL_LONDON = { lat: 51.5074, lng: -0.1278 };

/**
 * Main Application Component.
 * Wires the live auction into the entry point.
 */
const App: React.FC = () => {
  const [isAuctionRunning, setIsAuctionRunning] = useState(false);
  const [currentRound, setCurrentRound] = useState<RoundEvent | null>(null);
  const [outcome, setOutcome] = useState<AuctionOutcome | null>(null);
  const [slots, setSlots] = useState<SpatialBillboardSlot[]>([]);
  const [recentBids, setRecentBids] = useState<Bid[]>([]);

  const handleStartAuction = useCallback(async () => {
    if (isAuctionRunning) return;
    setIsAuctionRunning(true);

    try {
      // 1. Load Inventory
      const allSlots = await fetchInventory();

      // Filter to slots closest to central London to keep the scene smooth
      const sortedByProximity = [...allSlots].sort((a, b) => {
        const distA = Math.sqrt(Math.pow(a.latitude - CENTRAL_LONDON.lat, 2) + Math.pow(a.longitude - CENTRAL_LONDON.lng, 2));
        const distB = Math.sqrt(Math.pow(b.latitude - CENTRAL_LONDON.lat, 2) + Math.pow(b.longitude - CENTRAL_LONDON.lng, 2));
        return distA - distB;
      });

      const loadedSlots = sortedByProximity.slice(0, MAX_AUCTION_SLOTS);
      setSlots(loadedSlots);

      // 2. Setup Agents (4 agents with budgets and valuations)
      const agents: AdvertiserAgent[] = [
        { id: 'agent-1', budget: 5000, trueValuation: {} },
        { id: 'agent-2', budget: 4500, trueValuation: {} },
        { id: 'agent-3', budget: 6000, trueValuation: {} },
        { id: 'agent-4', budget: 5500, trueValuation: {} }
      ];

      // Assign deterministic private valuations based on agent index and basePrice
      agents.forEach((agent, index) => {
        loadedSlots.forEach(slot => {
          // Valuation is basePrice * (1.2 + 0.1 * agentIndex)
          agent.trueValuation[slot.id] = Math.floor(slot.basePrice * (1.2 + (index * 0.1)));
        });
      });

      const runtimes = agents.map(createAgentRuntime);

      // 3. Orchestrate
      const orchestrator = new ArenaOrchestrator(loadedSlots, runtimes);
      
      const result = await orchestrator.runAuction((event) => {
        setCurrentRound(event);
        setRecentBids([...event.bids]);
      });

      setOutcome(result);
    } catch (error) {
      console.error("Auction Failed:", error);
    } finally {
      // Keep running state true to show results/completed state
    }
  }, [isAuctionRunning]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#000' }}>
      {/* 3D Map Stage */}
      <LondonMapScene 
        slots={slots} 
        auctionLog={outcome?.log}
        clearingResults={outcome?.clearingResults}
      />

      {/* Auction Ticker Overlay */}
      <AuctionHUD event={currentRound} slots={slots} />

      {/* Final Results Scorecards */}
      <ScorecardOverlay scorecards={outcome?.scorecards} />

      {/* Floating Control Panel (Glassmorphism) */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        padding: '24px',
        borderRadius: '16px',
        background: 'rgba(15, 15, 25, 0.25)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
        color: '#fff',
        zIndex: 10
      }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', fontWeight: 700 }}>Arbiter</h1>
        <p style={{ margin: '0 0 20px 0', opacity: 0.8, fontSize: '0.9rem' }}>London Inventory Auction</p>
        
        {!isAuctionRunning ? (
          <button
            onClick={handleStartAuction}
            style={{
              padding: '12px 24px',
              borderRadius: '6px',
              border: 'none',
              background: '#3b82f6',
              color: 'white',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.2s',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          >
            Start Auction
          </button>
        ) : (
          <div style={{ 
            color: outcome ? '#60a5fa' : '#10b981', 
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: 'currentColor',
              animation: outcome ? 'none' : 'pulse 1.5s infinite' 
            }}></span>
            {outcome ? 'Auction Complete' : 'Auction in Progress...'}
          </div>
        )}
      </div>
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default App;