import { useEffect, useMemo, useState, useCallback } from 'react';

import type VPixEngine from '../../core/engine';
import { runCommand } from '../../core/commands';
import { KeymapBuilder } from '../../core/services/keymap-builder';
import { BindingScope } from '../../core/keybindings';
import { MODES } from '../../core/engine';
import type { Command } from '../../core/commands/common';

export type EngineHookConfig = {
  factory: () => VPixEngine;
  getViewportCells?: () => { width: number; height: number };
};

let lineId = 0;

export function useEngine({ factory, getViewportCells }: EngineHookConfig) {
  const engine = useMemo(factory, [factory]);
  const [frame, setFrame] = useState(0);
  const [feedLines, setFeedLines] = useState<{ id: number; text: string; type: 'in' | 'out' | 'tip' }[]>([]);
  const [currentPrefix, setCurrentPrefix] = useState<string | null>(null);
  const [currentCount, setCurrentCount] = useState<number | null>(null);

  const findCommandInKeymap = (
    targetKeymap: Keymap,
    currentMode: Mode,
    keyToFind: string,
    activePrefix: string | null,
  ): Command | undefined => {
    let cmd: Command | undefined;
    const currentScopeMap = targetKeymap.get(currentMode as BindingScope);
    const globalScopeMap = targetKeymap.get('global');

    // Try prefixed key first
    if (activePrefix !== null) {
      const prefixedKey = `${activePrefix}+${keyToFind}`;
      cmd = currentScopeMap?.get(prefixedKey);
      if (!cmd) cmd = globalScopeMap?.get(prefixedKey);
    }

    // If not found with prefix, try simple key
    if (!cmd) {
      cmd = currentScopeMap?.get(keyToFind);
      if (!cmd) cmd = globalScopeMap?.get(keyToFind);
    }
    return cmd;
  };


  const keymap = useMemo(() => {
    const builder = new KeymapBuilder();

    // Global Bindings
    builder.bind('global', 'Ctrl+D', 'cursor.page-down');
    builder.bind('global', 'Ctrl+U', 'cursor.page-up');
    builder.bind('global', 'Ctrl+F', 'cursor.page-forward');
    builder.bind('global', 'Ctrl+B', 'cursor.page-backward');
    builder.bind('global', '|', 'view.toggle-crosshair');
    builder.bind('global', 'Shift+|', 'view.toggle-crosshair'); // Turkish Q keyboard sends Shift+|
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
    builder.bind(normalScope, 'i', 'palette.pick-color');

    // Visual Mode Bindings (Phase 3)
    const visualScope: BindingScope = MODES.VISUAL;
    builder.bind(visualScope, 'h', 'selection.move-left');
    builder.bind(visualScope, 'j', 'selection.move-down');
    builder.bind(visualScope, 'k', 'selection.move-up');
    builder.bind(visualScope, 'l', 'selection.move-right');
    builder.bind(visualScope, 'Escape', 'selection.exit-visual');
    builder.bind(visualScope, 'y', 'selection.yank');
    builder.bind(visualScope, 'd', 'selection.delete');
    builder.bind(visualScope, 'p', 'selection.paste');

    // Normal Mode Bindings (Phase 4 - Prefixes, Operators, Motions, etc.)
    // Prefix-based Commands
    builder.bind(normalScope, 'g+g', 'motion.canvas-begin');
    builder.bind(normalScope, 'g+e', 'motion.word-end-prev');
    builder.bind(normalScope, 'g+c', 'palette.select-index'); // Requires count: 11gc
    builder.bind(normalScope, 'g+t', 'palette.cycle-next');
    builder.bind(normalScope, 'g+Shift+T', 'palette.cycle-previous');

    // Motion Commands
    builder.bind(normalScope, 'w', 'motion.word-next');
    builder.bind(normalScope, 'b', 'motion.word-prev');
    builder.bind(normalScope, 'e', 'motion.word-end-next');
    builder.bind(normalScope, '0', 'motion.line-begin');
    builder.bind(normalScope, '^', 'motion.line-first-nonblank');
    builder.bind(normalScope, '$', 'motion.line-end');
    builder.bind(normalScope, 'Shift+G', 'motion.canvas-end');

    // History and Repeat
    builder.bind(normalScope, 'u', 'history.undo');
    builder.bind(normalScope, '.', 'edit.repeat-last');

    // Visual Mode Bindings (Phase 4 - Remaining selection commands)
    builder.bind(visualScope, 'Shift+P', 'selection.paste-transparent');
    builder.bind(visualScope, ']', 'selection.rotate-cw');
    builder.bind(visualScope, '[', 'selection.rotate-ccw');
    builder.bind(visualScope, 'Shift+M', 'selection.move-to-cursor');
    builder.bind(visualScope, 'Shift+F', 'selection.fill');
    builder.bind(visualScope, 'Shift+R', 'selection.stroke-rect');
    builder.bind(visualScope, 'Shift+C', 'selection.stroke-circle');
    builder.bind(visualScope, 'Shift+O', 'selection.fill-circle');
    builder.bind(visualScope, 'Shift+L', 'selection.draw-line');
    builder.bind(visualScope, 'w', 'motion.word-next');
    builder.bind(visualScope, 'b', 'motion.word-prev');
    builder.bind(visualScope, 'e', 'motion.word-end-next');
    builder.bind(visualScope, 'f', 'selection.flood-fill');

    return builder.build();
  }, []); // Empty dependency array, so it runs once.

  const handleKeyDown = useCallback((evt: React.KeyboardEvent) => {
    const mockEvent = new KeyboardEvent('keydown', evt.nativeEvent);
    const key = KeymapBuilder.parseEvent(mockEvent);

    // Ignore modifier keys alone (don't clear prefix when holding Shift/Ctrl/Alt)
    // parseEvent returns lowercase: 'shift', 'ctrl', 'alt', 'meta'
    if (key === 'shift' || key === 'ctrl' || key === 'alt' || key === 'meta') {
      return false;
    }

    // 1. Handle Escape to clear prefix/count
    if (key === 'Escape') {
      if (currentPrefix !== null || currentCount !== null) {
        setCurrentPrefix(null);
        setCurrentCount(null);
        evt.preventDefault(); // Consume Escape if it cleared state
        return true; // Handled
      }
    }

    // 2. Handle Prefix Keys FIRST (g, d, y, c) - before digits
    // Note: 'r' removed - will use gc for all color selection
    if (currentPrefix === null && (key === 'g' || key === 'd' || key === 'y' || key === 'c')) {
      setCurrentPrefix(key);
      evt.preventDefault(); // Consume prefix key, wait for next key
      return true; // Handled
    }

    // 3. Handle Count (Digits) - can be used before any command
    const digit = parseInt(key, 10);
    if (!isNaN(digit) && digit >= 0 && digit <= 9) {
      if (digit === 0 && currentCount === null) {
        // Cannot start a count with 0, ignore
        return false; // Not handled by new system, let old system handle '0'
      }
      setCurrentCount((prev) => (prev === null ? digit : prev * 10 + digit));
      evt.preventDefault(); // Consume digit, wait for next key
      return true; // Handled (prefix stays active if set)
    }

    // 4. Find command
    let commandId = findCommandInKeymap(keymap, engine.mode, key, currentPrefix);

    if (commandId) {
      const count = currentCount !== null ? currentCount : 1;
      let args: Record<string, unknown> = { count };

      // Special handling for operator.set command args
      if (commandId === 'operator.set') {
        let operatorValue: OperatorKind;
        if (key === 'd') operatorValue = 'delete';
        else if (key === 'y') operatorValue = 'yank';
        else if (key === 'c') operatorValue = 'change';
        else operatorValue = 'delete'; // Fallback, should not happen
        args = { value: operatorValue, count };
      } else if (commandId === 'palette.select-index') {
        // 11gc means select color 11 (count becomes index)
        if (currentCount !== null) {
          args = { index: currentCount };
        } else {
          args = {}; // No index, will show error
        }
      } else if (
        commandId === 'cursor.page-down' ||
        commandId === 'cursor.page-up' ||
        commandId === 'cursor.page-forward' ||
        commandId === 'cursor.page-backward'
      ) {
        // Pass viewport size for page scroll commands
        const viewport = getViewportCells ? getViewportCells() : { width: 10, height: 10 };
        const viewportSize = engine.axis === 'horizontal' ? viewport.width : viewport.height;
        args = { viewportSize };
      }

      setCurrentPrefix(null); // Clear state after command execution
      setCurrentCount(null);
      evt.preventDefault(); // Prevent default for handled command
      runCommand(engine, commandId, args);
      return true; // Handled
    } else {
      // If no command found, and a prefix was active, clear prefix and fall back
      if (currentPrefix !== null) {
        setCurrentPrefix(null);
        // Now, try to find a command for the simple key (without prefix)
        commandId = findCommandInKeymap(keymap, engine.mode, key, null); // Try again with no prefix
        if (commandId) {
          const count = currentCount !== null ? currentCount : 1;
          setCurrentCount(null);
          evt.preventDefault(); // Prevent default for handled command
          runCommand(engine, commandId, { count });
          return true; // Handled
        }
      }
      // Otherwise, not handled by new system.
      return false;
    }
  }, [engine, keymap, currentPrefix, setCurrentPrefix, currentCount, setCurrentCount]);

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

  return { engine, frame, feedLines, handleKeyDown, currentPrefix, currentCount, keymap } as const;
}
