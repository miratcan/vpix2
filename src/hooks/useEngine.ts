import { useEffect, useMemo, useState } from 'react';

import type VPixEngine from '../../core/engine';

export type EngineHookConfig = {
  factory: () => VPixEngine;
};

let lineId = 0;

export function useEngine({ factory }: EngineHookConfig) {
  const engine = useMemo(factory, [factory]);
  const [frame, setFrame] = useState(0);
  const [feedLines, setFeedLines] = useState<{ id: number; text: string; type: 'in' | 'out' | 'tip' }[]>([]);

  useEffect(() => {
    const unsub = engine.subscribe((_, payload) => {
      setFrame((prev) => (payload?.revision ?? prev + 1));
      if (payload?.cmd) {
        const { display, lines, ok } = payload.cmd;
        const output = lines ?? [display];
        const newLines = output.filter(Boolean).map((text: string) => ({ id: lineId++, text, type: 'out' as const }));
        if (newLines.length) {
          setFeedLines((prev) => [...prev, ...newLines]);
        }
      }
    });
    return unsub;
  }, [engine]);

  return { engine, frame, feedLines } as const;
}
