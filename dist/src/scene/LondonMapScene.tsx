import React, { useState, useCallback, useMemo } from 'react';
import Map, { MapboxEvent } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import { SpatialBillboardSlot } from '../inventory/types';
import { AuctionLog } from '../core/log';
import { Bid } from '../core/model';
import { ClearingResult } from '../core/clearing';
import { DeckGLOverlay, useBidEdges, useClearingPulses, createMapLayers } from './mapHooks';

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
  const activeEdges = useBidEdges(recentBids, [...slots]);
  const pulses = useClearingPulses(clearingResults);

  const [viewState, setViewState] = useState({
    longitude: -0.1278,
    latitude: 51.5074,
    zoom: 19,
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

  // Fly to user location if within London bounding box
  React.useEffect(() => {
    if (!navigator.geolocation) return;

    const LONDON_BBOX = { south: 51.28, west: -0.51, north: 51.70, east: 0.33 };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const isInsideLondon = 
          latitude >= LONDON_BBOX.south && 
          latitude <= LONDON_BBOX.north && 
          longitude >= LONDON_BBOX.west && 
          longitude <= LONDON_BBOX.east;

        if (isInsideLondon) {
          setViewState(prev => ({
            ...prev,
            latitude,
            longitude,
            zoom: 19
          }));
        }
      },
      undefined,
      { enableHighAccuracy: false, timeout: 5000, maximumAge: Infinity }
    );
  }, []);

  const layers = useMemo(() => {
    const internalLayers = createMapLayers(slots, auctionLog, clearingResults, activeEdges, pulses);
    return [...internalLayers, ...externalLayers];
  }, [slots, auctionLog, clearingResults, activeEdges, pulses, externalLayers]);

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