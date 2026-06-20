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
      const loadedSlots = await fetchInventory();
      setSlots(loadedSlots);

      // 2. Setup Agents (4 agents with budgets and valuations)
      const agents: AdvertiserAgent[] = [
        { id: 'agent-1', budget: 5000, trueValuation: {} },
        { id: 'agent-2', budget: 4500, trueValuation: {} },
        { id: 'agent-3', budget: 6000, trueValuation: {} },
        { id: 'agent-4', budget: 5500, trueValuation: {} }
      ];

      // Assign random-ish private valuations based on basePrice for the demo
      agents.forEach(agent => {
        loadedSlots.forEach(slot => {
          agent.trueValuation[slot.id] = Math.floor(slot.basePrice * (1.2 + Math.random()));
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
        borderRadius: '12px',
        background: 'rgba(20, 20, 30, 0.7)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
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