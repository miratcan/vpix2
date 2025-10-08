import { type CommandDefinition } from './common';

export const paintCommands: CommandDefinition[] = [
  {
    id: 'paint.brush',
    summary: 'Activate the brush tool',
    description: 'Sets the current painting tool to the brush.',
    keybindings: [{ key: 'b', when: 'normal' }],
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
    keybindings: [{ key: 'l', when: 'normal' }],
    patterns: [{ pattern: 'line', help: 'activate line tool' }],
    handler: ({ engine }) => {
      engine.tool = 'line';
      return { ok: true, msg: 'line tool activated' };
    },
  },
];