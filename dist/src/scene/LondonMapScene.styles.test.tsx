import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MapMock } from './testMocks';
import { render, act } from '@testing-library/react';
import React from 'react';
import LondonMapScene from './LondonMapScene';

describe('LondonMapScene Styles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retries style configuration until read-back confirms values or max attempts reached', async () => {
    const setConfigPropertyMock = vi.fn();
    const getConfigPropertyMock = vi.fn();
    
    const mockMap = {
      setConfigProperty: setConfigPropertyMock,
      getConfigProperty: getConfigPropertyMock
    };

    vi.stubEnv('VITE_MAPBOX_TOKEN', 'pk.test-token');
    render(<LondonMapScene />);
    
    // Find the call for the main map specifically
    const mainMapCall = MapMock.mock.calls.find(call => call[0].id === 'main-map');
    const onStyleData = mainMapCall?.[0]?.onStyleData;

    if (typeof onStyleData !== 'function') {
      throw new Error(`onStyleData is not a function. Total Map calls: ${MapMock.mock.calls.length}`);
    }

    // Attempt 1: Simulation of failure (read-back returns defaults)
    getConfigPropertyMock.mockReturnValueOnce('day').mockReturnValueOnce('default');
    act(() => {
      onStyleData({ target: mockMap });
    });
    expect(setConfigPropertyMock).toHaveBeenCalledTimes(2);

    // Attempt 2: Success
    getConfigPropertyMock.mockReturnValueOnce('night').mockReturnValueOnce('faded');
    act(() => {
      onStyleData({ target: mockMap });
    });
    expect(setConfigPropertyMock).toHaveBeenCalledTimes(4);

    // Attempt 3: Should not run again because success was recorded
    act(() => {
      onStyleData({ target: mockMap });
    });
    expect(setConfigPropertyMock).toHaveBeenCalledTimes(4);
  });

  it('stops retrying after maximum attempts even if failing', async () => {
    const setConfigPropertyMock = vi.fn();
    const getConfigPropertyMock = vi.fn().mockReturnValue('day');
    
    const mockMap = {
      setConfigProperty: setConfigPropertyMock,
      getConfigProperty: getConfigPropertyMock
    };

    vi.stubEnv('VITE_MAPBOX_TOKEN', 'pk.test-token');
    render(<LondonMapScene />);
    const mainMapCall = MapMock.mock.calls.find(call => call[0].id === 'main-map');
    const onStyleData = mainMapCall?.[0]?.onStyleData;

    if (typeof onStyleData !== 'function') {
      throw new Error(`onStyleData is not a function. Total Map calls: ${MapMock.mock.calls.length}`);
    }

    // Trigger 6 times (Max is 5)
    act(() => {
      for (let i = 0; i < 6; i++) {
        onStyleData({ target: mockMap });
      }
    });

    // Should have tried exactly 5 times (2 calls per attempt)
    expect(setConfigPropertyMock).toHaveBeenCalledTimes(10);
  });
});