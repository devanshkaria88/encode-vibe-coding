import { describe, it, expect, vi } from 'vitest';
import { ArenaOrchestrator } from './orchestrator';
import { LocalRoundStream } from './stream';
import { createBillboardSlot, createAdvertiserAgent } from '../core/index';
import { DeterministicAgentRuntime } from '../agents/runtime';
import { BidDecision } from '../agents/types';

describe('ArenaOrchestrator', () => {
  const slotA = createBillboardSlot({ id: 'A', name: 'Slot A', basePrice: 100, bidIncrement: 10 });
  const agent1 = createAdvertiserAgent({ id: 'Agent1', budget: 1000, trueValuation: { 'A': 200 } });
  const agent2 = createAdvertiserAgent({ id: 'Agent2', budget: 1000, trueValuation: { 'A': 150 } });

  it('terminates an uncontested auction when only one agent bids', async () => {
    // Agent 1 bids, Agent 2 drops immediately
    const runtime1 = new DeterministicAgentRuntime(agent1, (state) => [{
      slotId: 'A', action: 'raise', amount: 100
    }]);
    const runtime2 = new DeterministicAgentRuntime(agent2, (state) => [{
      slotId: 'A', action: 'drop'
    }]);

    const orchestrator = new ArenaOrchestrator([slotA], [runtime1, runtime2]);
    const outcome = await orchestrator.runAuction();

    expect(outcome.clearingResults['A'].winner?.id).toBe('Agent1');
    expect(outcome.clearingResults['A'].clearingPrice).toBe(100); // Uncontested
    expect(outcome.slots).toEqual([slotA]);
    expect(outcome.scorecards['Agent1'].surplusCaptured).toBe(100); // 200 - 100
  });

  it('resolves a contested auction through bidding war', async () => {
    // Both agents bid until Agent 2 hits valuation
    const runtime1 = new DeterministicAgentRuntime(agent1, (state) => {
      const current = state.standingBids['A'];
      return [{ slotId: 'A', action: 'raise', amount: current + 10 }];
    });
    
    const runtime2 = new DeterministicAgentRuntime(agent2, (state) => {
      const current = state.standingBids['A'];
      if (current >= 150) return [{ slotId: 'A', action: 'drop' }];
      return [{ slotId: 'A', action: 'raise', amount: current + 10 }];
    });

    const orchestrator = new ArenaOrchestrator([slotA], [runtime1, runtime2]);
    const outcome = await orchestrator.runAuction();

    expect(outcome.clearingResults['A'].winner?.id).toBe('Agent1');
    expect(outcome.clearingResults['A'].clearingPrice).toBeGreaterThanOrEqual(150);
  });

  it('applies the stall rule when agents hold', async () => {
    // Both agents bid once, then hold
    let bidCount = 0;
    const runtime1 = new DeterministicAgentRuntime(agent1, (state) => {
      if (bidCount < 1) { bidCount++; return [{ slotId: 'A', action: 'raise', amount: 100 }]; }
      return [{ slotId: 'A', action: 'hold' }];
    });
    const runtime2 = new DeterministicAgentRuntime(agent2, (state) => {
      return [{ slotId: 'A', action: 'hold' }];
    });

    const orchestrator = new ArenaOrchestrator([slotA], [runtime1, runtime2]);
    const outcome = await orchestrator.runAuction();

    // Stall rule should make the leader (Agent1) the winner
    expect(outcome.clearingResults['A'].winner?.id).toBe('Agent1');
  });

  it('emits round events through the provided stream', async () => {
    const stream = new LocalRoundStream();
    const events: any[] = [];
    stream.subscribe(e => events.push(e));

    const runtime1 = new DeterministicAgentRuntime(agent1, (state) => [{
      slotId: 'A', action: 'raise', amount: 100
    }]);
    const runtime2 = new DeterministicAgentRuntime(agent2, (state) => [{
      slotId: 'A', action: 'drop'
    }]);

    const orchestrator = new ArenaOrchestrator([slotA], [runtime1, runtime2], stream);
    const outcome = await orchestrator.runAuction();

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].round).toBe(1);
    expect(events[0].standingBids['A']).toBe(100);
    expect(outcome.log.getEventsForSlot('A').some(e => 'priceAtDropOut' in e)).toBe(true);
    
    // Check that referee was called and computed scorecards
    expect(outcome.scorecards['Agent2']).toBeDefined();
    expect(outcome.scorecards['Agent2'].leftOnTable).toBeGreaterThan(0);
  });

  it('calls the optional onRoundEnd listener after each round', async () => {
    const rounds: RoundEvent[] = [];
    const onRoundEnd = (event: RoundEvent) => {
      rounds.push(event);
    };

    const runtime1 = new DeterministicAgentRuntime(agent1, (state) => [{
      slotId: 'A', action: 'raise', amount: 110
    }]);
    const runtime2 = new DeterministicAgentRuntime(agent2, (state) => [{
      slotId: 'A', action: 'drop'
    }]);

    const orchestrator = new ArenaOrchestrator([slotA], [runtime1, runtime2]);
    await orchestrator.runAuction(onRoundEnd);

    expect(rounds.length).toBeGreaterThan(0);
    expect(rounds[0].round).toBe(1);
    expect(rounds[0].standingBids['A']).toBe(110);
    // Verify specific structure of RoundEvent
    expect(rounds[0]).toHaveProperty('remainingBudgets');
    expect(rounds[0]).toHaveProperty('dropOuts');
  });
});