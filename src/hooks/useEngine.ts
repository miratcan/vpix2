import { useEffect, useMemo, useState } from 'react';

import type VPixEngine from '../../core/engine';
import type { Rect } from '../../core/engine';

export type EngineHookConfig = {
  factory: () => VPixEngine;
};

export function useEngine({ factory }: EngineHookConfig) {
  const engine = useMemo(factory, [factory]);
  const [frame, setFrame] = useState(0);
  const [dirtyRects, setDirtyRects] = useState<Rect[] | null>(null);

  useEffect(() => {
    const unsub = engine.subscribe((_, payload) => {
      setFrame((t) => t + 1);
      setDirtyRects(payload?.changed ?? null);
    });
    return unsub;
  }, [engine]);

  return { engine, frame, dirtyRects } as const;
}
