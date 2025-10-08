import { type CommandDefinition } from './common';

export const axisCommands: CommandDefinition[] = [
  {
    id: 'axis.toggle',
    summary: 'Toggle axis',
    description: 'Toggles the movement and operation axis between horizontal and vertical.',
    keybindings: [{ key: 'Tab', when: 'global' }],
    patterns: [{ pattern: 'axis-toggle', help: 'toggle movement axis' }],
    handler: ({ engine }) => {
      engine.toggleAxis();
      return { ok: true, msg: `axis set to ${engine.axis}` };
    },
  },
  {
    id: 'axis.set-horizontal',
    summary: 'Set axis to horizontal',
    description: 'Sets the movement and operation axis to horizontal.',
    patterns: [{ pattern: 'axis-horizontal', help: 'set movement axis to horizontal' }],
    handler: ({ engine }) => {
      engine.setAxis('horizontal');
      return { ok: true, msg: 'axis set to horizontal' };
    },
  },
  {
    id: 'axis.set-vertical',
    summary: 'Set axis to vertical',
    description: 'Sets the movement and operation axis to vertical.',
    patterns: [{ pattern: 'axis-vertical', help: 'set movement axis to vertical' }],
    handler: ({ engine }) => {
      engine.setAxis('vertical');
      return { ok: true, msg: 'axis set to vertical' };
    },
  },
];