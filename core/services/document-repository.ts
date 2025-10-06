import type { EngineSnapshot } from '../engine';

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
};

function defaultStorage(): StorageLike | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    /* no-op */
  }
  return null;
}

export interface IDocumentRepository {
  load(): EngineSnapshot | null;
  save(snapshot: EngineSnapshot): boolean;
}

export class DocumentRepository implements IDocumentRepository {
  private readonly storageProvider: () => StorageLike | null;

  constructor(private readonly storageKey: string, storage?: () => StorageLike | null) {
    this.storageProvider = storage || defaultStorage;
  }

  load(): EngineSnapshot | null {
    const storage = this.storageProvider();
    if (!storage) return null;
    try {
      const raw = storage.getItem(this.storageKey);
      if (!raw) return null;
      const data = JSON.parse(raw) as EngineSnapshot;
      return {
        width: data.width,
        height: data.height,
        palette: (data.palette || []).slice(),
        currentColorIndex: data.currentColorIndex ?? 0,
        grid: (data.grid || []).map((row) => Array.from(row ?? [])),
      };
    } catch {
      return null;
    }
  }

  save(snapshot: EngineSnapshot) {
    const storage = this.storageProvider();
    if (!storage) return false;
    try {
      storage.setItem(this.storageKey, JSON.stringify(snapshot));
      return true;
    } catch {
      return false;
    }
  }
}
