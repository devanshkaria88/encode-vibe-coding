import { useState, useEffect } from 'react';
import { useControl } from 'react-map-gl';
import { IconLayer, ArcLayer, ScatterplotLayer } from '@deck.gl/layers';
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
 * Simple SVG-based icon for the billboard sign.
 * Rounded rectangle with a bright border.
 */
const BILLBOARD_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="48" viewBox="0 0 64 48">
  <rect x="2" y="2" width="60" height="44" rx="8" fill="currentColor" stroke="white" stroke-width="4" />
</svg>
`.trim();

const BILLBOARD_ICON_DATA = `data:image/svg+xml;base64,${btoa(BILLBOARD_ICON_SVG)}`;

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
      // :AdditionalFunctionality: Small, subtle glowing ring on the ground marking the exact spot
      new ScatterplotLayer<SpatialBillboardSlot>({
        id: 'billboard-halos',
        data: [...slots],
        getPosition: d => [d.lon, d.lat],
        getRadius: d => (pulses[d.id] ? 15 : 10), // Modest size
        getFillColor: d => {
          const result = clearingResults[d.id];
          const color = result?.winner ? AGENT_COLORS[result.winner.id] : [255, 255, 255]; // White/Highlight
          return [...color, 100];
        },
        stroked: true,
        getLineColor: [255, 255, 255, 200],
        getLineWidth: 1,
        pickable: false,
        updateTriggers: {
          getRadius: [pulses],
          getFillColor: [clearingResults]
        }
      }),
      // :AdditionalFunctionality: Flat camera-facing billboard sign image
      new IconLayer<SpatialBillboardSlot>({
        id: 'billboard-icons',
        data: [...slots],
        getPosition: d => [d.lon, d.lat],
        // Position at rooftop height
        getPixelOffset: [0, -40], 
        getIcon: () => ({
          url: BILLBOARD_ICON_DATA,
          width: 64,
          height: 48,
          mask: true // Allows re-coloring via getColor
        }),
        getSize: 32, // Fixed screen pixel size
        sizeUnits: 'pixels',
        getColor: d => {
          const result = clearingResults[d.id];
          if (result?.winner) {
            return [...AGENT_COLORS[result.winner.id], 255];
          }
          return [255, 255, 100, 255]; // Vivid highlight color
        },
        pickable: true,
        billboard: true,
        updateTriggers: {
          getColor: [clearingResults]
        }
      })
    ])
  ];
}