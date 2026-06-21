import React, { useState, useCallback, useMemo, useRef } from 'react';
import Map, { MapboxEvent, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import { SpatialBillboardSlot } from '../inventory/types';
import { AuctionLog } from '../core/log';
import { Bid } from '../core/model';
import { ClearingResult } from '../core/clearing';
import { DeckGLOverlay, useBidEdges, useClearingPulses, createMapLayers } from './mapHooks';
import MiniMap from './MiniMap';

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
  const styleConfigured = useRef(false);
  const centeredOnSlots = useRef(false);
  const configAttempts = useRef(0);
  const MAX_CONFIG_ATTEMPTS = 5;

  if (!mapboxToken) {
    console.error("Missing VITE_MAPBOX_TOKEN environment variable.");
  }

  /**
   * :AdditionalFunctionality:
   * Applies Mapbox Standard style configuration reliably using a read-back check.
   */
  const onStyleData = useCallback((e: MapboxEvent) => {
    const map = e.target;

    // Guard: Stop if already successful or max attempts reached
    if (styleConfigured.current || configAttempts.current >= MAX_CONFIG_ATTEMPTS) {
      return;
    }

    try {
      // Attempt to set properties
      map.setConfigProperty('basemap', 'lightPreset', 'night');
      map.setConfigProperty('basemap', 'theme', 'faded');

      // Verify if the properties actually took effect
      const currentPreset = map.getConfigProperty ? map.getConfigProperty('basemap', 'lightPreset') : 'night';
      const currentTheme = map.getConfigProperty ? map.getConfigProperty('basemap', 'theme') : 'faded';

      if (currentPreset === 'night' && currentTheme === 'faded') {
        styleConfigured.current = true;
      } else {
        configAttempts.current += 1;
      }
    } catch (err) {
      // Catch errors in case the style structure isn't ready for config properties
      configAttempts.current += 1;
      if (configAttempts.current >= MAX_CONFIG_ATTEMPTS) {
        console.warn("Failed to apply Mapbox Standard config after maximum attempts", err);
      }
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

  // :AdditionalFunctionality: Centre camera on billboards when they load
  React.useEffect(() => {
    if (slots.length > 0 && !centeredOnSlots.current) {
      const validSlots = slots.filter(s => Number.isFinite(s.longitude) && Number.isFinite(s.latitude));
      
      if (validSlots.length > 0) {
        const avgLon = validSlots.reduce((sum, s) => sum + s.longitude, 0) / validSlots.length;
        const avgLat = validSlots.reduce((sum, s) => sum + s.latitude, 0) / validSlots.length;

        setViewState(prev => ({
          ...prev,
          longitude: avgLon,
          latitude: avgLat,
          zoom: 14
        }));
        
        centeredOnSlots.current = true;
      }
    }
  }, [slots]);

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
        id="main-map"
        {...{ "data-testid": "main-map" } as any}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/standard"
        mapboxAccessToken={mapboxToken}
        onStyleData={onStyleData}
        antialias={true}
        dragRotate={true}
        touchZoomRotate={true}
      >
        <NavigationControl position="bottom-right" visualizePitch={true} />
        <DeckGLOverlay layers={layers} />
      </Map>
      <MiniMap longitude={viewState.longitude} latitude={viewState.latitude} />
    </div>
  );
};

export default LondonMapScene;