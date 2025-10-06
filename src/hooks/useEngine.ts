import { useEffect, useMemo, useState } from 'react';

import type VPixEngine from '../../core/engine';

export type EngineHookConfig = {
  factory: () => VPixEngine;
};

export function useEngine({ factory }: EngineHookConfig) {
  const engine = useMemo(factory, [factory]);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const unsub = engine.subscribe((_, payload) => {
      setFrame((prev) => (payload?.revision ?? prev + 1));
    });
    return unsub;
  }, [engine]);

  return { engine, frame } as const;
}
