import { type CommandDefinition, ensureCount } from './common';

export const cursorCommands: CommandDefinition[] = [
  {
    id: 'cursor.move-up',
    summary: 'Move cursor up',
    description: 'Moves the cursor up by one cell.',
    keybindings: [{ key: 'k', when: 'normal' }],
    patterns: [{ pattern: 'cursor up', help: 'move cursor up' }],
    handler: ({ engine }) => {
      engine.move(0, -1);
      return { ok: true };
    },
  },
  {
    id: 'cursor.move-down',
    summary: 'Move cursor down',
    description: 'Moves the cursor down by one cell.',
    keybindings: [{ key: 'j', when: 'normal' }],
    patterns: [{ pattern: 'cursor down', help: 'move cursor down' }],
    handler: ({ engine }) => {
      engine.move(0, 1);
      return { ok: true };
    },
  },
  {
    id: 'cursor.move-left',
    summary: 'Move cursor left',
    description: 'Moves the cursor left by one cell.',
    keybindings: [{ key: 'h', when: 'normal' }],
    patterns: [{ pattern: 'cursor left', help: 'move cursor left' }],
    handler: ({ engine }) => {
      engine.move(-1, 0);
      return { ok: true };
    },
  },
  {
    id: 'cursor.move-right',
    summary: 'Move cursor right',
    description: 'Moves the cursor right by one cell.',
    keybindings: [{ key: 'l', when: 'normal' }],
    patterns: [{ pattern: 'cursor right', help: 'move cursor right' }],
    handler: ({ engine }) => {
      engine.move(1, 0);
      return { ok: true };
    },
  },
  {
    id: 'motion.line-begin',
    summary: 'Move to line beginning',
    description: 'Moves the cursor to the beginning of the current line.',
    keybindings: [{ key: '0', when: 'normal' }],
    patterns: [
      { pattern: '{count:number} 0', help: '[count] 0' },
      { pattern: '0', help: '0' }
    ],
    handler: ({ engine }, { count }) => {
      const c = ensureCount(count);
      if (engine.pendingOperator) {
        const motion = engine.resolveMotion('line-begin', c);
        const segment = engine.computeOperatorSegment(engine.cursor, motion);
        if (segment) {
          const op = engine.pendingOperator.op;
          if (op === 'delete') engine.deleteSegment(segment);
          else if (op === 'yank') engine.yankSegment(segment);
          else if (op === 'change') {
            engine.deleteSegment(segment);
            engine.setMode('insert' as any);
          }
        }
        engine.clearPendingOperator();
        engine.cursor = motion.target;
      } else {
        engine.applyMotion('line-begin', c);
      }
      return { ok: true, silent: true };
    },
  },
  {
    id: 'motion.word-next',
    summary: 'Move to next word',
    description: 'Moves the cursor to the start of the next word.',
    keybindings: [{ key: 'w', when: 'normal' }],
    patterns: [
      { pattern: '{count:number} w', help: '[count] w' },
      { pattern: 'w', help: 'w' }
    ],
    handler: ({ engine }, { count }) => {
      const c = ensureCount(count);
      if (engine.pendingOperator) {
        const motion = engine.resolveMotion('word-next', c);
        const segment = engine.computeOperatorSegment(engine.cursor, motion);
        if (segment) {
          const op = engine.pendingOperator.op;
          if (op === 'delete') {
            const changed = engine.deleteSegment(segment);
            if (changed) engine.recordLastAction((eng) => {
              const m = eng.resolveMotion('word-next', c);
              const seg = eng.computeOperatorSegment(eng.cursor, m);
              if (seg) eng.deleteSegment(seg);
            });
          }
          else if (op === 'yank') engine.yankSegment(segment);
          else if (op === 'change') {
            engine.deleteSegment(segment);
            engine.setMode('insert' as any);
          }
        }
        engine.clearPendingOperator();
        engine.cursor = motion.target;
      } else {
        engine.applyMotion('word-next', c);
      }
      return { ok: true, silent: true };
    },
  },
  {
    id: 'motion.word-prev',
    summary: 'Move to previous word',
    description: 'Moves the cursor to the start of the previous word.',
    keybindings: [{ key: 'b', when: 'normal' }],
    patterns: [
      { pattern: '{count:number} b', help: '[count] b' },
      { pattern: 'b', help: 'b' }
    ],
    handler: ({ engine }, { count }) => {
      const c = ensureCount(count);
      if (engine.pendingOperator) {
        const motion = engine.resolveMotion('word-prev', c);
        const segment = engine.computeOperatorSegment(engine.cursor, motion);
        if (segment) {
          const op = engine.pendingOperator.op;
          if (op === 'delete') engine.deleteSegment(segment);
          else if (op === 'yank') engine.yankSegment(segment);
          else if (op === 'change') {
            engine.deleteSegment(segment);
            engine.setMode('insert' as any);
          }
        }
        engine.clearPendingOperator();
        engine.cursor = motion.target;
      } else {
        engine.applyMotion('word-prev', c);
      }
      return { ok: true, silent: true };
    },
  },
  {
    id: 'motion.word-end-next',
    summary: 'Move to end of word',
    description: 'Moves the cursor to the end of the current or next word.',
    keybindings: [{ key: 'e', when: 'normal' }],
    patterns: [
      { pattern: '{count:number} e', help: '[count] e' },
      { pattern: 'e', help: 'e' }
    ],
    handler: ({ engine }, { count }) => {
      const c = ensureCount(count);
      if (engine.pendingOperator) {
        const motion = engine.resolveMotion('word-end-next', c);
        const segment = engine.computeOperatorSegment(engine.cursor, motion);
        if (segment) {
          const op = engine.pendingOperator.op;
          if (op === 'delete') engine.deleteSegment(segment);
          else if (op === 'yank') engine.yankSegment(segment);
          else if (op === 'change') {
            engine.deleteSegment(segment);
            engine.setMode('insert' as any);
          }
        }
        engine.clearPendingOperator();
        engine.cursor = motion.target;
      } else {
        engine.applyMotion('word-end-next', c);
      }
      return { ok: true, silent: true };
    },
  },
  {
    id: 'motion.word-end-prev',
    summary: 'Move to end of previous word',
    description: 'Moves the cursor to the end of the previous word.',
    keybindings: [{ key: 'ge', when: 'normal' }],
    patterns: [
      { pattern: '{count:number} ge', help: '[count] ge' },
      { pattern: 'ge', help: 'ge' }
    ],
    handler: ({ engine }, { count }) => {
      const c = ensureCount(count);
      if (engine.pendingOperator) {
        const motion = engine.resolveMotion('word-end-prev', c);
        const segment = engine.computeOperatorSegment(engine.cursor, motion);
        if (segment) {
          const op = engine.pendingOperator.op;
          if (op === 'delete') engine.deleteSegment(segment);
          else if (op === 'yank') engine.yankSegment(segment);
          else if (op === 'change') {
            engine.deleteSegment(segment);
            engine.setMode('insert' as any);
          }
        }
        engine.clearPendingOperator();
        engine.cursor = motion.target;
      } else {
        engine.applyMotion('word-end-prev', c);
      }
      return { ok: true, silent: true };
    },
  },
  {
    id: 'motion.grid-begin',
    summary: 'Move to grid beginning',
    description: 'Moves the cursor to the beginning of the grid.',
    keybindings: [{ key: 'gg', when: 'normal' }],
    patterns: [
      { pattern: '{count:number} gg', help: '[count] gg' },
      { pattern: 'gg', help: 'gg' }
    ],
    handler: ({ engine }, { count }) => {
      const c = ensureCount(count);
      if (engine.pendingOperator) {
        const motion = engine.resolveMotion('grid-begin', c);
        const segment = engine.computeOperatorSegment(engine.cursor, motion);
        if (segment) {
          const op = engine.pendingOperator.op;
          if (op === 'delete') engine.deleteSegment(segment);
          else if (op === 'yank') engine.yankSegment(segment);
          else if (op === 'change') {
            engine.deleteSegment(segment);
            engine.setMode('insert' as any);
          }
        }
        engine.clearPendingOperator();
        engine.cursor = motion.target;
      } else {
        engine.applyMotion('grid-begin', c);
      }
      return { ok: true, silent: true };
    },
  },
  {
    id: 'motion.grid-end',
    summary: 'Move to grid end',
    description: 'Moves the cursor to the end of the grid.',
    keybindings: [{ key: 'G', when: 'normal' }],
    patterns: [
      { pattern: '{count:number} G', help: '[count] G' },
      { pattern: 'G', help: 'G' }
    ],
    handler: ({ engine }, { count }) => {
      const c = ensureCount(count);
      if (engine.pendingOperator) {
        const motion = engine.resolveMotion('grid-end', c);
        const segment = engine.computeOperatorSegment(engine.cursor, motion);
        if (segment) {
          const op = engine.pendingOperator.op;
          if (op === 'delete') engine.deleteSegment(segment);
          else if (op === 'yank') engine.yankSegment(segment);
          else if (op === 'change') {
            engine.deleteSegment(segment);
            engine.setMode('insert' as any);
          }
        }
        engine.clearPendingOperator();
        engine.cursor = motion.target;
      } else {
        engine.applyMotion('grid-end', c);
      }
      return { ok: true, silent: true };
    },
  },
  {
    id: 'operator.delete',
    summary: 'Delete operator',
    description: 'Initiates a delete operation, to be followed by a motion.',
    keybindings: [{ key: 'd', when: 'normal' }],
    patterns: [
      { pattern: '{count:number} d', help: '[count] d' },
      { pattern: 'd', help: 'd' }
    ],
    handler: ({ engine }, { count }) => {
      const c = ensureCount(count);
      engine.setPendingOperator('delete', c);
      return { ok: true, silent: true };
    },
  },
  {
    id: 'operator.yank',
    summary: 'Yank operator',
    description: 'Initiates a yank (copy) operation, to be followed by a motion.',
    keybindings: [{ key: 'y', when: 'normal' }],
    patterns: [
      { pattern: '{count:number} y', help: '[count] y' },
      { pattern: 'y', help: 'y' }
    ],
    handler: ({ engine }, { count }) => {
      const c = ensureCount(count);
      engine.setPendingOperator('yank', c);
      return { ok: true, silent: true };
    },
  },
  {
    id: 'operator.change',
    summary: 'Change operator',
    description: 'Initiates a change operation, to be followed by a motion.',
    keybindings: [{ key: 'c', when: 'normal' }],
    patterns: [
      { pattern: '{count:number} c', help: '[count] c' },
      { pattern: 'c', help: 'c' }
    ],
    handler: ({ engine }, { count }) => {
      const c = ensureCount(count);
      engine.setPendingOperator('change', c);
      return { ok: true, silent: true };
    },
  },
  {
    id: 'operator.delete-line',
    summary: 'Delete entire line',
    description: 'Deletes the entire current line.',
    keybindings: [{ key: 'D', when: 'normal' }],
    patterns: [
      { pattern: '{count:number} D', help: '[count] D' },
      { pattern: 'D', help: 'D' }
    ],
    handler: ({ engine }, { count }) => {
      const c = ensureCount(count);
      engine.deleteAxisLines(c);
      return { ok: true, silent: true };
    },
  },
  {
    id: 'operator.repeat',
    summary: 'Repeat last action',
    description: 'Repeats the last action performed.',
    keybindings: [{ key: '.', when: 'normal' }],
    patterns: [{ pattern: 'repeat', help: 'repeat last action' }],
    handler: ({ engine }) => {
      engine.repeatLastAction();
      return { ok: true, silent: true };
    },
  },
];
