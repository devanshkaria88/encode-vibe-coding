import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchInventory } from './source';

describe('Inventory Source', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      clear: vi.fn()
    });
  });

  it('should return cached file data if available', async () => {
    const mockData = [{ id: '1', name: 'Cached', basePrice: 100, bidIncrement: 10, lat: 0, lon: 0 }];
    
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const result = await fetchInventory();
    expect(result).toEqual(mockData);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/cache/london_inventory.json');
  });

  it('should return localStorage data if file cache is missing', async () => {
    // File cache fails
    (fetch as any).mockResolvedValueOnce({ ok: false });
    // Local storage has data
    const mockLocalData = [{ id: '2', name: 'Local', basePrice: 200, bidIncrement: 20, lat: 0, lon: 0 }];
    (localStorage.getItem as any).mockReturnValue(JSON.stringify(mockLocalData));

    const result = await fetchInventory();
    expect(result).toEqual(mockLocalData);
    expect(localStorage.getItem).toHaveBeenCalled();
  });

  it('should fetch from Overpass and save to localStorage if both caches are missing', async () => {
    // File cache fails
    (fetch as any).mockResolvedValueOnce({ ok: false });
    // Local storage is empty
    (localStorage.getItem as any).mockReturnValue(null);
    
    // Overpass succeeds
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [
          { type: 'node', id: 99, lat: 51.5, lon: -0.1, tags: { 'advertising': 'billboard' } }
        ]
      }),
    });

    const result = await fetchInventory();
    expect(result[0].id).toBe('99');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'arbiter_inventory_cache',
      expect.stringContaining('"id":"99"')
    );
  });

  it('should throw error if Overpass API fails', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: false }); // cache fail
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    await expect(fetchInventory()).rejects.toThrow(/Overpass API error/);
  });
});