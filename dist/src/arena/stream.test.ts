import { describe, it, expect, vi } from 'vitest';
import { LocalRoundStream } from './stream';
import { RoundEvent } from './types';

describe('LocalRoundStream', () => {
  it('notifies subscribers when a round event is pushed', async () => {
    const stream = new LocalRoundStream();
    const callback = vi.fn();
    
    stream.subscribe(callback);
    
    const event: RoundEvent = {
      round: 1,
      standingBids: { 'slot-1': 100 },
      dropOuts: { 'slot-1': [] },
      remainingBudgets: { 'agent-1': 500 }
    };
    
    await stream.push(event);
    
    expect(callback).toHaveBeenCalledWith(event);
  });

  it('stops notifying after unsubscription', async () => {
    const stream = new LocalRoundStream();
    const callback = vi.fn();
    
    const unsubscribe = stream.subscribe(callback);
    unsubscribe();
    
    await stream.push({
      round: 2,
      standingBids: {},
      dropOuts: {},
      remainingBudgets: {}
    });
    
    expect(callback).not.toHaveBeenCalled();
  });
});