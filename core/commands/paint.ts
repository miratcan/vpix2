import type { CommandDefinition } from './common';
import { ensureCount } from './common';

export const paintCommands: CommandDefinition[] = [
  {
    id: 'paint.erase',
    summary: 'Erase cells',
    handler: ({ engine }, { count }) => {
      const times = ensureCount(count);
      for (let i = 0; i < times; i += 1) engine.erase();
      engine.recordLastAction((eng) => {
        for (let i = 0; i < times; i += 1) eng.erase();
      });
      return `Erased ${times} pixel(s).`;
    },
    patterns: [
      { pattern: 'erase', help: 'erase', mapArgs: () => ({ count: 1 }) },
      { pattern: 'erase {count:int[1..512]}', help: 'erase <count>' },
    ],
  },
  {
    id: 'paint.cut',
    summary: 'Cut cells (delete and yank to clipboard)',
    handler: ({ engine }, { count }) => {
      const times = ensureCount(count);
      for (let i = 0; i < times; i += 1) engine.cut();
      engine.recordLastAction((eng) => {
        for (let i = 0; i < times; i += 1) eng.cut();
      });
      return `Cut ${times} pixel(s) to clipboard.`;
    },
    patterns: [
      { pattern: 'cut', help: 'cut', mapArgs: () => ({ count: 1 }) },
      { pattern: 'cut {count:int[1..512]}', help: 'cut <count>' },
    ],
  },
  {
    id: 'paint.toggle',
    summary: 'Toggle cells',
    handler: ({ engine }, { count }) => {
      const times = ensureCount(count);
      for (let i = 0; i < times; i += 1) engine.toggle();
      engine.recordLastAction((eng) => {
        for (let i = 0; i < times; i += 1) eng.toggle();
      });
      return `Toggled ${times} pixel(s).`;
    },
    patterns: [
      { pattern: 'toggle', help: 'toggle', mapArgs: () => ({ count: 1 }) },
      { pattern: 'toggle {count:int[1..512]}', help: 'toggle <count>' },
    ],
  },
  {
    id: 'paint.apply',
    summary: 'Paint current cell',
    handler: ({ engine }) => {
      const colorIndex = engine.currentColorIndex;
      engine.paint(colorIndex);
      engine.recordLastAction((eng) => {
        eng.paint(colorIndex);
      });
      return 'Painted pixel at cursor.';
    },
    patterns: [{ pattern: 'paint', help: 'paint' }],
  },
];
