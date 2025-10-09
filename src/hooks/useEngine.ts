import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import VPixEngine from '../../core/engine';
import { COMMAND_DEFINITIONS, executeCommand, suggestCommands } from '../../core/commands';
import { buildKeymapTree } from '../../core/services/keymap-builder';

export function useEngine({ factory }: { factory: () => VPixEngine }) {
  const [revision, setRevision] = useState(0);
  const [feedLines, setFeedLines] = useState<Array<{ id: number; text: string; type: string }>>([]);
  const nextFeedLineId = useRef(0);
  const chordBuffer = useRef<any>(null);
  const chordTimeout = useRef<any>(null);

  const engine = useMemo(() => factory(), [factory]);

  const keymapTree = useMemo(() => buildKeymapTree(COMMAND_DEFINITIONS), []);

      const handleKey = useCallback((e: { key: string; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; metaKey: boolean; preventDefault: () => void; }) => {
        const key = e.key;

        if (chordTimeout.current) {
          clearTimeout(chordTimeout.current);
          chordTimeout.current = null;
        }

        // Handle count input
        if (engine.pushCountDigit(key)) {
          if (e?.preventDefault) e.preventDefault();
          return;
        }

        let commandMatch: string | undefined;

        if (chordBuffer.current) {
          const nextLevel = chordBuffer.current[key];
          if (typeof nextLevel === 'string') {
            commandMatch = nextLevel;
            chordBuffer.current = null;
          } else if (typeof nextLevel === 'object') {
            chordBuffer.current = nextLevel;
            // If this object has a __cmd, set timeout to execute it
            if (nextLevel.__cmd) {
              chordTimeout.current = setTimeout(() => {
                const cmd = chordBuffer.current?.__cmd;
                chordBuffer.current = null;
                if (cmd) {
                  const count = engine.countValue();
                  engine.clearCount();
                  const fullCommand = count > 1 ? `${count} ${cmd}` : cmd;
                  executeCommand(engine, fullCommand);
                }
              }, 1000);
            } else {
              chordTimeout.current = setTimeout(() => {
                chordBuffer.current = null;
              }, 1000);
            }
          } else {
            chordBuffer.current = null;
          }
        } else {
          const currentMode = engine.getMode();
          const modeMap = keymapTree[currentMode] || {};
          const globalMap = keymapTree['global'] || {};

          const potentialMatch = modeMap[key] || globalMap[key];

          if (typeof potentialMatch === 'string') {
            commandMatch = potentialMatch;
          } else if (typeof potentialMatch === 'object') {
            chordBuffer.current = potentialMatch;
            // If this object has a __cmd, set timeout to execute it
            if (potentialMatch.__cmd) {
              chordTimeout.current = setTimeout(() => {
                const cmd = chordBuffer.current?.__cmd;
                chordBuffer.current = null;
                if (cmd) {
                  const count = engine.countValue();
                  engine.clearCount();
                  const fullCommand = count > 1 ? `${count} ${cmd}` : cmd;
                  executeCommand(engine, fullCommand);
                }
              }, 1000);
            } else {
              chordTimeout.current = setTimeout(() => {
                chordBuffer.current = null;
              }, 1000);
            }
          }
        }

        if (commandMatch) {
                  if (e?.preventDefault) e.preventDefault();
                  const count = engine.countValue();
                  engine.clearCount();
                  const fullCommand = count > 1 ? `${count} ${commandMatch}` : commandMatch;
                  executeCommand(engine, fullCommand);
                }      }, [engine, keymapTree, chordBuffer, chordTimeout]);
  useEffect(() => {
    const handleCommandEvent = (payload: any) => {
      console.log('[debug] Command event received:', payload);
      if (payload.cmd) {
        const id = nextFeedLineId.current++;
        const text = payload.cmd.display || payload.cmd.msg || '';
        const type = payload.cmd.ok === false ? 'error' : 'info';
        setFeedLines((prev) => [...prev, { id, text, type }]);
      }
    };

    const revisionHandler = () => setRevision((r) => r + 1);

    const unsubscribeChange = engine.subscribe((eng, payload) => {
      if (payload?.revision) revisionHandler();
    });
    const unsubscribeCmd = engine.subscribe((eng, payload) => {
      if (payload?.cmd) handleCommandEvent(payload);
    });

    return () => {
      unsubscribeChange();
      unsubscribeCmd();
    };
  }, [engine, keymapTree, handleKey]);

  return { engine, frame: revision, feedLines, handleKey };
}