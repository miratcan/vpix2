import { useEffect, useMemo, useState, useCallback } from 'react';

import type VPixEngine from '../../core/engine';
import { runCommand } from '../../core/commands';
import { KeymapBuilder, type Keymap } from '../../core/services/keymap-builder';
import type { BindingScope } from '../../core/keybindings';
import type { Mode } from '../../core/engine/types';
import type { Command, OperatorKind } from '../../core/commands/common';
import { buildKeymapFromSpec } from './keymapSpec';

export type EngineHookConfig = {
  factory: () => VPixEngine;
  getViewportCells?: () => { width: number; height: number };
};

export function useEngine({ factory, getViewportCells }: EngineHookConfig) {
  const engine = useMemo(factory, [factory]);
  const [frame, setFrame] = useState(0);
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
  const keymap = useMemo(() => buildKeymapFromSpec(), []);

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
    });
    return unsub;
  }, [engine]);

  return { engine, frame, handleKeyDown, currentPrefix, currentCount, keymap } as const;
}
