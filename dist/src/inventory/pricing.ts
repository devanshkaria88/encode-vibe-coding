/**
 * PricingModel implementation.
 * Turns a billboard's area into a deterministic basePrice and bidIncrement.
 */

export interface Pricing {
  readonly basePrice: number;
  readonly bidIncrement: number;
}

const DEFAULT_FACE_AREA_SQM = 12;
const BASE_FLAT_FEE = 50;
const PRICE_PER_SQM = 25;
const INCREMENT_PERCENTAGE = 0.1;
const MIN_BID_INCREMENT = 5;

/**
 * Calculates the pricing for a billboard based on its face area.
 * @param areaSquareMeters The estimated face area in square metres.
 * @returns An object containing the basePrice and bidIncrement.
 */
export function calculatePricing(areaSquareMeters?: number): Pricing {
  const area = (areaSquareMeters !== undefined && !isNaN(areaSquareMeters)) 
    ? areaSquareMeters 
    : DEFAULT_FACE_AREA_SQM;

  if (area < 0) {
    throw new Error(`Invalid area: areaSquareMeters cannot be negative. Provided: ${area}`);
  }

  // basePrice = 50 pounds plus 25 pounds per square metre of face area, rounded to the nearest whole pound.
  const basePrice = Math.round(BASE_FLAT_FEE + (PRICE_PER_SQM * area));

  // bidIncrement = 10 percent of basePrice, rounded to the nearest whole pound, with a floor of 5 pounds.
  const calculatedIncrement = Math.round(basePrice * INCREMENT_PERCENTAGE);
  const bidIncrement = Math.max(MIN_BID_INCREMENT, calculatedIncrement);

  return {
    basePrice,
    bidIncrement,
  };
}