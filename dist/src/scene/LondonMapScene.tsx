import React, { useState, useCallback, useMemo } from 'react';
import Map, { useControl, MapboxEvent } from 'react-map-gl';
import { ColumnLayer, ArcLayer } from '@deck.gl/layers';
import { MapboxOverlay, MapboxOverlayProps } from '@deck.gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

/**
 * DeckGL overlay hook for Mapbox integration.
 */
function DeckGLOverlay(props: MapboxOverlayProps) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  if (overlay) {
    overlay.setProps(props);
  }
  return null;
}

import { SpatialBillboardSlot } from '../inventory/types';
import { AuctionLog } from '../core/log';
import { Bid } from '../core/model';
import { BidEdge, PulseState } from './types';
import { AGENT_ANCHORS, AGENT_COLORS } from './anchors';
import { ClearingResult } from '../core/clearing';

interface LondonMapSceneProps {
  slots?: readonly SpatialBillboardSlot[];
  auctionLog?: AuctionLog;
  recentBids?: Bid[];
  clearingResults?: Record<string, ClearingResult>;
  layers?: any[];
}

/**
 * :LondonMapScene: 
 * A full-viewport Mapbox 3D map of London with a deck.gl overlay.
 */
export const LondonMapScene: React.FC<LondonMapSceneProps> = ({ 
  slots = [], 
  auctionLog, 
  recentBids = [], 
  clearingResults = {},
  layers: externalLayers = [] 
}) => {
  const [activeEdges, setActiveEdges] = useState<BidEdge[]>([]);
  const [pulses, setPulses] = useState<Record<string, PulseState>>({});

  const [viewState, setViewState] = useState({
    longitude: -0.1278,
    latitude: 51.5074,
    zoom: 15.5,
    pitch: 60,
    bearing: 0
  });

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

  if (!mapboxToken) {
    console.error("Missing VITE_MAPBOX_TOKEN environment variable.");
  }

  // Configure the 3D Standard style on load
  const onStyleData = useCallback((e: MapboxEvent) => {
    const map = e.target;
    // Mapbox Standard style configuration
    try {
      if (map.getStyle()) {
        map.setConfigProperty('basemap', 'lightPreset', 'night');
        map.setConfigProperty('basemap', 'theme', 'faded');
      }
    } catch (err) {
      // Graceful degradation if style doesn't support these properties yet
      console.warn("Could not set Mapbox Standard config properties", err);
    }
  }, []);

  // Process new bids into edges and handle expiration
  React.useEffect(() => {
    if (recentBids.length > 0) {
      const now = Date.now();
      const newEdges: BidEdge[] = recentBids.map(bid => {
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

      setActiveEdges(prev => [...prev, ...newEdges]);

      const timer = setTimeout(() => {
        setActiveEdges(prev => prev.filter(edge => Date.now() - edge.timestamp < 2000));
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [recentBids, slots]);

  // Trigger pulses when clearing results arrive
  React.useEffect(() => {
    const now = Date.now();
    const newPulses: Record<string, PulseState> = {};
    let changed = false;

    for (const slotId in clearingResults) {
      if (!pulses[slotId]) {
        newPulses[slotId] = { slotId, startTime: now };
        changed = true;
      }
    }

    if (changed) {
      setPulses(prev => ({ ...prev, ...newPulses }));
      const timer = setTimeout(() => {
        setPulses({}); // Reset pulses after 1s
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [clearingResults]);

  const layers = useMemo(() => {
    const internalLayers = [
      new ArcLayer<BidEdge>({
        id: 'bid-arcs',
        data: activeEdges,
        getSourcePosition: d => [d.startLon, d.startLat],
        getTargetPosition: d => [d.endLon, d.endLat],
        getSourceColor: d => [...(AGENT_COLORS[d.agentId] || [255, 255, 255]), 200],
        getTargetColor: d => [...(AGENT_COLORS[d.agentId] || [255, 255, 255]), 50],
        getWidth: 3,
      }),
      ...(!slots.length ? [] : [
        new ColumnLayer<SpatialBillboardSlot>({
          id: 'billboard-columns',
          data: [...slots],
          getPosition: d => [d.lon, d.lat],
          getElevation: d => {
            const result = clearingResults[d.id];
            const price = result?.clearingPrice ?? (auctionLog ? auctionLog.getStandingBid(d) : d.basePrice);
            return price * 0.1;
          },
          getFillColor: d => {
            const result = clearingResults[d.id];
            if (result?.winner) {
              return [...AGENT_COLORS[result.winner.id], 255];
            }
            const price = auctionLog ? auctionLog.getStandingBid(d) : d.basePrice;
            const ratio = Math.min(price / (d.basePrice * 5), 1);
            return [255 * ratio, 100, 255 * (1 - ratio), 200];
          },
          radius: 15,
          extruded: true,
          pickable: true,
          elevationScale: 1,
          // Pulse effect: increase radius briefly
          getRadius: d => (pulses[d.id] ? 25 : 15),
          updateTriggers: {
            getElevation: [auctionLog, clearingResults],
            getFillColor: [auctionLog, clearingResults],
            getRadius: [pulses]
          }
        })
      ])
    ];

    return [...internalLayers, ...externalLayers];
  }, [slots, auctionLog, externalLayers]);

  return (
    <div 
      style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}
      role="region"
      aria-label="London Map Stage"
    >
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/standard"
        mapboxAccessToken={mapboxToken}
        onStyleData={onStyleData}
        antialias={true}
      >
        <DeckGLOverlay layers={layers} />
      </Map>
    </div>
  );
};

export default LondonMapScene;