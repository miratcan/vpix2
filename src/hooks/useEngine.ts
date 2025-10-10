import { useEffect, useMemo, useState } from 'react';

import type VPixEngine from '../../core/engine';
import { runCommand } from '../../core/commands';
import { KeymapBuilder } from '../../core/services/keymap-builder';
import { BindingScope } from '../../core/keybindings';
import { MODES } from '../../core/engine';
import type { Command } from '../../core/commands/common';

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

    // Global Bindings
    builder.bind('global', 'Ctrl+^', 'palette.swap-last-color');
    builder.bind('global', 'Tab', 'axis.toggle');

    // Normal Mode Bindings (Phase 1 & 2)
    const normalScope: BindingScope = MODES.NORMAL;
    builder.bind(normalScope, 'h', 'cursor.move-left');
    builder.bind(normalScope, 'ArrowLeft', 'cursor.move-left');
    builder.bind(normalScope, 'j', 'cursor.move-down');
    builder.bind(normalScope, 'ArrowDown', 'cursor.move-down');
    builder.bind(normalScope, 'k', 'cursor.move-up');
    builder.bind(normalScope, 'ArrowUp', 'cursor.move-up');
    builder.bind(normalScope, 'l', 'cursor.move-right');
    builder.bind(normalScope, 'ArrowRight', 'cursor.move-right');
    builder.bind(normalScope, 'x', 'paint.erase');
    builder.bind(normalScope, ' ', 'paint.toggle');
    builder.bind(normalScope, 'p', 'clipboard.paste');
    builder.bind(normalScope, 'v', 'mode.visual');

    // Visual Mode Bindings (Phase 3)
    const visualScope: BindingScope = MODES.VISUAL;
    builder.bind(visualScope, 'h', 'selection.move-left');
    builder.bind(visualScope, 'j', 'selection.move-down');
    builder.bind(visualScope, 'k', 'selection.move-up');
    builder.bind(visualScope, 'l', 'selection.move-right');
    builder.bind(visualScope, 'Escape', 'selection.exit-visual');

    return builder.build();
  }, []); // Empty dependency array, so it runs once.

  useEffect(() => {
    const originalHandleKey = engine.handleKey.bind(engine);

    engine.handleKey = (evt: { key: string; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean }) => {
      const mockEvent = new KeyboardEvent('keydown', evt);
      const key = KeymapBuilder.parseEvent(mockEvent);

      let commandId: Command | undefined;

      // 1. Try current mode's scope (normal or visual)
      const currentModeScope: BindingScope = engine.mode;
      const modeKeymap = keymap.get(currentModeScope);
      if (modeKeymap) {
        commandId = modeKeymap.get(key);
      }

      // 2. If not found in mode scope, try global scope
      if (!commandId) {
        const globalKeymap = keymap.get('global');
        if (globalKeymap) {
          commandId = globalKeymap.get(key);
        }
      }

      if (commandId) {
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
