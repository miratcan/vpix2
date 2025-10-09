import { type CommandDefinition } from './common';

export const paintCommands: CommandDefinition[] = [
  {
    id: 'paint.brush',
    summary: 'Activate the brush tool',
    description: 'Sets the current painting tool to the brush.',
    patterns: [{ pattern: 'brush', help: 'activate brush tool' }],
    handler: ({ engine }) => {
      engine.tool = 'brush';
      return { ok: true, msg: 'brush tool activated' };
    },
  },
  {
    id: 'paint.line',
    summary: 'Activate the line tool',
    description: 'Sets the current painting tool to the line tool.',
    keybindings: [{ key: 'L', when: 'normal' }],
    patterns: [{ pattern: 'line', help: 'activate line tool' }],
    handler: ({ engine }) => {
      engine.tool = 'line';
      return { ok: true, msg: 'line tool activated' };
    },
  },
  {
    id: 'paint.cut',
    summary: 'Cut current cell',
    description: 'Cuts the current cell and copies it to the clipboard.',
    keybindings: [{ key: 'x', when: 'normal' }],
    patterns: [{ pattern: 'cut', help: 'cut current cell' }],
    handler: ({ engine }) => {
      engine.cut();
      return { ok: true, msg: 'cut' };
    },
  },
];