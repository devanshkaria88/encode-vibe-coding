import { RoundEvent } from './types';

/**
 * RoundStream is the channel that pushes each RoundEvent.
 */
export interface RoundStream {
  push(event: RoundEvent): Promise<void>;
}

/**
 * Implementation of RoundStream that could be wired to WebSockets or SSE.
 * For the local orchestrator, this acts as the event emitter.
 */
export class LocalRoundStream implements RoundStream {
  private listeners: ((event: RoundEvent) => void)[] = [];

  subscribe(callback: (event: RoundEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  async push(event: RoundEvent): Promise<void> {
    // In a real production environment, this would broadcast via WebSocket or SSE.
    this.listeners.forEach(listener => listener(event));
  }
}