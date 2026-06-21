import { useState, useEffect } from 'react';
import { useControl } from 'react-map-gl';
import { ColumnLayer, ArcLayer, ScatterplotLayer } from '@deck.gl/layers';
import { MapboxOverlay, MapboxOverlayProps } from '@deck.gl/mapbox';
import { BidEdge, PulseState } from './types';
import { AGENT_ANCHORS, AGENT_COLORS } from './anchors';
import { Bid, BillboardSlot } from '../core/model';
import { SpatialBillboardSlot } from '../inventory/types';
import { AuctionLog } from '../core/log';
import { ClearingResult } from '../core/clearing';

/**
 * DeckGL overlay hook for Mapbox integration.
 */
export function DeckGLOverlay(props: MapboxOverlayProps) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  if (overlay) {
    overlay.setProps(props);
  }
  return null;
}

/**
 * Hook to manage transient bid arcs on the map.
 */
export function useBidEdges(recentBids: Bid[], slots: SpatialBillboardSlot[]) {
  const [activeEdges, setActiveEdges] = useState<BidEdge[]>([]);

  useEffect(() => {
    if (recentBids.length === 0) return;

    const now = Date.now();
    const newEdges: BidEdge[] = recentBids
      .filter(bid => !activeEdges.some(e => e.agentId === bid.agentId && e.slotId === bid.slotId && e.round === bid.round))
      .map(bid => {
        const anchor = AGENT_ANCHORS[bid.agentId];
        const slot = slots.find(s => s.id === bid.slotId);
        return {
          ...bid,
          startLat: anchor?.lat ?? 51.5,
          startLon: anchor?.lon ?? -0.1,
          endLat: slot?.lat ?? 51.5,
          endLon: slot?.lon ?? -0.1,
          timestamp: now
        };
      });

    if (newEdges.length > 0) {
      setActiveEdges(prev => [...prev, ...newEdges].filter(edge => now - edge.timestamp < 2000));
    }
  }, [recentBids, slots]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setActiveEdges(prev => {
        const filtered = prev.filter(edge => now - edge.timestamp < 2000);
        return filtered.length === prev.length ? prev : filtered;
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return activeEdges;
}

/**
 * Hook to manage pulse animations for cleared slots.
 */
export function useClearingPulses(clearingResults: Record<string, ClearingResult>) {
  const [pulses, setPulses] = useState<Record<string, PulseState>>({});

  useEffect(() => {
    const now = Date.now();
    const newSlotIds = Object.keys(clearingResults).filter(id => !pulses[id]);

    if (newSlotIds.length > 0) {
      const added: Record<string, PulseState> = {};
      newSlotIds.forEach(id => {
        added[id] = { slotId: id, startTime: now };
      });
      
      setPulses(prev => ({ ...prev, ...added }));
      
      const timer = setTimeout(() => {
        setPulses(prev => {
          const next = { ...prev };
          newSlotIds.forEach(id => delete next[id]);
          return next;
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [clearingResults]);

  return pulses;
}

/**
 * Factory for creating DeckGL layers based on current auction state.
 */
export function createMapLayers(
  slots: readonly SpatialBillboardSlot[],
  auctionLog: AuctionLog | undefined,
  clearingResults: Record<string, ClearingResult>,
  activeEdges: BidEdge[],
  pulses: Record<string, PulseState>
) {
  return [
    new ArcLayer<BidEdge>({
      id: 'bid-arcs',
      data: activeEdges,
      getSourcePosition: d => [d.startLon, d.startLat],
      getTargetPosition: d => [d.endLon, d.endLat],
      getSourceColor: d => [...(AGENT_COLORS[d.agentId] || [255, 255, 255]), 200],
      getTargetColor: d => [...(AGENT_COLORS[d.agentId] || [255, 255, 255]), 50],
      getWidth: 3,
    }),
    ...(slots.length === 0 ? [] : [
      // :AdditionalFunctionality: Soft glowing halo highlighting the building location
      new ScatterplotLayer<SpatialBillboardSlot>({
        id: 'billboard-halos',
        data: [...slots],
        getPosition: d => [d.lon, d.lat],
        getRadius: d => {
          const price = clearingResults[d.id]?.clearingPrice ?? (auctionLog ? auctionLog.getStandingBid(d) : d.basePrice);
          const baseSize = pulses[d.id] ? 30 : 20;
          return baseSize + Math.min(price / 100, 40); // Size scales with value
        },
        getFillColor: d => {
          const result = clearingResults[d.id];
          const color = result?.winner ? AGENT_COLORS[result.winner.id] : [255, 255, 255];
          const price = result?.clearingPrice ?? (auctionLog ? auctionLog.getStandingBid(d) : d.basePrice);
          const opacity = Math.min(100 + (price / 50), 200); // Brightens with value
          return [...color, opacity];
        },
        stroked: false,
        pickable: false,
        updateTriggers: {
          getRadius: [auctionLog, clearingResults, pulses],
          getFillColor: [auctionLog, clearingResults]
        }
      }),
      // :AdditionalFunctionality: Compact marker pinned at rooftop height
      new ColumnLayer<SpatialBillboardSlot>({
        id: 'billboard-columns',
        data: [...slots],
        getPosition: d => [d.lon, d.lat],
        offset: [0, 0],
        getElevation: () => 40, // Raised to roughly rooftop height
        getFillColor: d => {
          const result = clearingResults[d.id];
          if (result?.winner) {
            return [...AGENT_COLORS[result.winner.id], 255];
          }
          return [200, 200, 200, 255];
        },
        radius: 2, // Thin post appearance
        extruded: true,
        pickable: true,
        elevationScale: 1,
        updateTriggers: {
          getFillColor: [clearingResults]
        }
      })
    ])
  ];
}