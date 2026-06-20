import { calculatePricing } from './pricing';
import { createBillboardSlot } from '../core/model';
import { OverpassElement, SpatialBillboardSlot } from './types';

export function normalizeOverpassElement(el: OverpassElement): SpatialBillboardSlot | null {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;

  if (lat === undefined || lon === undefined) {
    return null;
  }

  // Extract area if available, otherwise undefined for default
  let area: number | undefined;
  if (el.tags?.height && el.tags?.width) {
    const h = parseFloat(el.tags.height);
    const w = parseFloat(el.tags.width);
    if (!isNaN(h) && !isNaN(w)) {
      area = h * w;
    }
  }

  const pricing = calculatePricing(area);
  const name = el.tags?.name || `Billboard ${el.id}`;

  const coreSlot = createBillboardSlot({
    id: el.id.toString(),
    name: name,
    basePrice: pricing.basePrice,
    bidIncrement: pricing.bidIncrement,
  });

  return {
    ...coreSlot,
    lat,
    lon,
  };
}