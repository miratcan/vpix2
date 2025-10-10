import { useEffect, useMemo, useState } from 'react';

import type VPixEngine from '../../core/engine';
import { runCommand } from '../../core/commands';
import { KeymapBuilder } from '../../core/services/keymap-builder';

export type EngineHookConfig = {
  factory: () => VPixEngine;
};

let lineId = 0;

export function useEngine({ factory }: EngineHookConfig) {
  const engine = useMemo(factory, [factory]);
  const [frame, setFrame] = useState(0);
  const [feedLines, setFeedLines] = useState<{ id: number; text: string; type: 'in' | 'out' | 'tip' }[]>([]);

  const keymap = useMemo(() => {
    const builder = new KeymapBuilder();

    // Navigation Commands (Phase 1)
    builder.bind('h', 'cursor.move-left');
    builder.bind('ArrowLeft', 'cursor.move-left');

    builder.bind('j', 'cursor.move-down');
    builder.bind('ArrowDown', 'cursor.move-down');

    builder.bind('k', 'cursor.move-up');
    builder.bind('ArrowUp', 'cursor.move-up');

    builder.bind('l', 'cursor.move-right');
    builder.bind('ArrowRight', 'cursor.move-right');

    return builder.build();
  }, []); // Empty dependency array, so it runs once.

  useEffect(() => {
    const originalHandleKey = engine.handleKey.bind(engine);

    engine.handleKey = (evt: { key: string; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean }) => {
      // Do not handle keys if modifiers other than Shift are pressed (for now)
      if (evt.ctrlKey || evt.altKey || evt.metaKey) {
        return originalHandleKey(evt);
      }

      // The `parseEvent` method is static and expects a browser KeyboardEvent.
      // We need to construct a minimal one for it to work.
      const mockEvent = new KeyboardEvent('keydown', evt);
      const key = KeymapBuilder.parseEvent(mockEvent);
      const commandId = keymap.get(key);

      if (commandId) {
        // If we found it in our new map, run it and stop.
        return runCommand(engine, commandId);
      } else {
        // Otherwise, fall back to the old system.
        return originalHandleKey(evt);
      }
    };

    return () => {
      engine.handleKey = originalHandleKey;
    };
  }, [engine, keymap]);

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
