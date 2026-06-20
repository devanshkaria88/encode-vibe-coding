import { describe, it, expect } from 'vitest';
import { normalizeOverpassElement } from './normalizer';
import { OverpassElement } from './types';

describe('Inventory Normalizer', () => {
  it('should normalize a valid node element', () => {
    const el: OverpassElement = {
      type: 'node',
      id: 123,
      lat: 51.5,
      lon: -0.1,
      tags: { name: 'Test Billboard', height: '3', width: '4' }
    };
    const result = normalizeOverpassElement(el);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('123');
    expect(result?.name).toBe('Test Billboard');
    // area 12 -> basePrice 350
    expect(result?.basePrice).toBe(350);
  });

  it('should return null if coordinates are missing', () => {
    const el: OverpassElement = {
      type: 'node',
      id: 123,
      tags: { name: 'Broken' }
    };
    const result = normalizeOverpassElement(el);
    expect(result).toBeNull();
  });

  it('should use default area when tags are missing', () => {
    const el: OverpassElement = {
      type: 'node',
      id: 456,
      lat: 51.5,
      lon: -0.1,
      tags: {}
    };
    const result = normalizeOverpassElement(el);
    expect(result?.basePrice).toBe(350); // Default 12sqm pricing
  });
});