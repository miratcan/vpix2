import { useState, useEffect, useMemo } from 'react';
import VPixEngine from '../../core/engine';
import { COMMAND_DEFINITIONS, executeCommand, suggestCommands } from '../../core/commands';
import { buildKeymapTree } from '../../core/services/keymap-builder';

let engine: VPixEngine | null = null;

function getEngine() {
  if (engine) return engine;
  engine = new VPixEngine();
  // Assign to window for debugging in development mode
  if (import.meta.env.DEV) {
    (window as any).vpix2 = engine;
  }
  return engine;
}

export function useEngine() {
  const [revision, setRevision] = useState(0);

  const keymapTree = useMemo(() => buildKeymapTree(COMMAND_DEFINITIONS), []);

  useEffect(() => {
    const engine = getEngine();
    const chordBuffer: any = { current: null };
    const chordTimeout: any = { current: null };

    const handler = (e: { key: string; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; metaKey: boolean; preventDefault: () => void; }) => {
      const key = e.key;

      if (chordTimeout.current) {
        clearTimeout(chordTimeout.current);
        chordTimeout.current = null;
      }

      let commandId: string | undefined;

      if (chordBuffer.current) {
        const nextLevel = chordBuffer.current[key];
        if (typeof nextLevel === 'string') {
          commandId = nextLevel;
          chordBuffer.current = null;
        } else if (typeof nextLevel === 'object') {
          chordBuffer.current = nextLevel;
          chordTimeout.current = setTimeout(() => {
            chordBuffer.current = null;
          }, 1000);
        } else {
          chordBuffer.current = null;
        }
      } else {
        const currentMode = engine.getMode();
        const modeMap = keymapTree[currentMode] || {};
        const globalMap = keymapTree['global'] || {};

        const potentialMatch = modeMap[key] || globalMap[key];

        if (typeof potentialMatch === 'string') {
          commandId = potentialMatch;
        } else if (typeof potentialMatch === 'object') {
          chordBuffer.current = potentialMatch;
          chordTimeout.current = setTimeout(() => {
            chordBuffer.current = null;
          }, 1000);
        }
      }

      if (commandId) {
        e.preventDefault();
        executeCommand(engine, commandId);
      }
    };

    const revisionHandler = () => setRevision((r) => r + 1);

    engine.on('change', revisionHandler);
    window.addEventListener('keydown', handler);

    return () => {
      engine.off('change', revisionHandler);
      window.removeEventListener('keydown', handler);
    };
  }, [keymapTree]);

  return { engine: getEngine(), revision, executeCommand, suggestCommands };
}