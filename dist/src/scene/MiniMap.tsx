import React from 'react';
import Map from 'react-map-gl';

interface MiniMapProps {
  longitude: number;
  latitude: number;
}

/**
 * :MiniMap: Overview inset.
 * Shows a 2D top-down view centered on the main map's coordinates.
 * Styled as a light liquid-glass card.
 */
const MiniMap: React.FC<MiniMapProps> = ({ longitude, latitude }) => {
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

  return (
    <div
      data-testid="mini-map-container"
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '180px',
        height: '180px',
        borderRadius: '16px',
        overflow: 'hidden',
        background: 'rgba(15, 15, 25, 0.2)',
        backdropFilter: 'blur(8px) saturate(180%)',
        WebkitBackdropFilter: 'blur(8px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
        zIndex: 110,
        pointerEvents: 'none',
      }}
    >
      <Map
        id="mini-map-instance"
        data-testid="mini-map-instance"
        longitude={longitude}
        latitude={latitude}
        zoom={12}
        pitch={0}
        bearing={0}
        interactive={false}
        mapStyle="mapbox://styles/mapbox/standard"
        mapboxAccessToken={mapboxToken}
        style={{ width: '100%', height: '100%' }}
      />
      
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '10px',
          height: '10px',
          backgroundColor: '#3B82F6',
          border: '2px solid white',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 10px rgba(59, 130, 246, 0.8)',
          zIndex: 120
        }}
      />
    </div>
  );
};

export default MiniMap;