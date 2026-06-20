import { SpatialBillboardSlot, OverpassResponse } from './types';
import { normalizeOverpassElement } from './normalizer';

const OVERPASS_URL = import.meta.env?.VITE_OVERPASS_URL || 'https://overpass-api.de/api/interpreter';
const LONDON_BBOX = '51.28,-0.51,51.70,0.33';
const CACHE_PATH = '/cache/london_inventory.json';
const LOCAL_STORAGE_KEY = 'arbiter_inventory_cache';

const OVERPASS_QUERY = `
[out:json][timeout:25];
(
  node["advertising"="billboard"](${LONDON_BBOX});
  way["advertising"="billboard"](${LONDON_BBOX});
);
out center;
`;

export async function fetchInventory(): Promise<SpatialBillboardSlot[]> {
  // 1. Try to fetch from static cache file first
  try {
    const cachedResponse = await fetch(CACHE_PATH);
    if (cachedResponse.ok) {
      return await cachedResponse.json();
    }
  } catch (e) {
    console.warn('Inventory cache file not found, checking local storage...', e);
  }

  // 2. Try to fetch from local storage (previous live fetch result)
  try {
    const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (localData) {
      return JSON.parse(localData);
    }
  } catch (e) {
    // Silently continue to live fetch
  }

  // 3. Fetch from Overpass
  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    body: `data=${encodeURIComponent(OVERPASS_QUERY)}`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
  }

  const data: OverpassResponse = await response.json();
  
  // 4. Normalize
  const slots: SpatialBillboardSlot[] = data.elements
    .map(normalizeOverpassElement)
    .filter((slot): slot is SpatialBillboardSlot => slot !== null);

  // 5. Write to cache (localStorage) for subsequent calls
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(slots));
  } catch (e) {
    console.error('Failed to write to local storage cache:', e);
  }

  return slots;
}