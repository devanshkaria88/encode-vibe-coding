import { describe, it, expect } from 'vitest';
import { calculatePricing } from './pricing';

describe('PricingModel', () => {
  it('should use default area of 12sqm when no area is provided', () => {
    // basePrice = 50 + (25 * 12) = 50 + 300 = 350
    // bidIncrement = 10% of 350 = 35
    const pricing = calculatePricing();
    expect(pricing.basePrice).toBe(350);
    expect(pricing.bidIncrement).toBe(35);
  });

  it('should calculate pricing correctly for a specific area', () => {
    // area = 10
    // basePrice = 50 + (25 * 10) = 300
    // bidIncrement = 10% of 300 = 30
    const pricing = calculatePricing(10);
    expect(pricing.basePrice).toBe(300);
    expect(pricing.bidIncrement).toBe(30);
  });

  it('should round basePrice to the nearest whole pound', () => {
    // area = 2.33
    // basePrice = 50 + (25 * 2.33) = 50 + 58.25 = 108.25 -> 108
    const pricing = calculatePricing(2.33);
    expect(pricing.basePrice).toBe(108);
  });

  it('should enforce a floor of 5 pounds for bidIncrement', () => {
    // area = 0
    // basePrice = 50 + 0 = 50
    // 10% of 50 = 5. Floor is 5.
    const pricingSmall = calculatePricing(0);
    expect(pricingSmall.bidIncrement).toBe(5);

    // area = -1.5 (should throw but testing small positive for floor)
    // basePrice = 50 + (25 * 0.1) = 52.5 -> 53
    // 10% of 53 = 5.3 -> 5. Floor is 5.
    const pricingVerySmall = calculatePricing(0.1);
    expect(pricingVerySmall.bidIncrement).toBe(5);
  });

  it('should round bidIncrement to the nearest whole pound', () => {
    // area = 1.0
    // basePrice = 50 + 25 = 75
    // 10% of 75 = 7.5 -> 8
    const pricing = calculatePricing(1);
    expect(pricing.bidIncrement).toBe(8);
  });

  it('should throw an error for negative area', () => {
    expect(() => calculatePricing(-5)).toThrow(/cannot be negative/);
  });
});