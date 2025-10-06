import type { EngineChangePayload } from './types';

export type EngineSubscriber<T> = (state: T, payload?: EngineChangePayload) => void;

export class EngineEvents<T> {
  private readonly subscribers = new Set<EngineSubscriber<T>>();

  subscribe(fn: EngineSubscriber<T>) {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  emit(state: T, payload?: EngineChangePayload) {
    for (const fn of this.subscribers) {
      fn(state, payload);
    }
  }
}
