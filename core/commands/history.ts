import { type CommandDefinition } from './common';

export const historyCommands: CommandDefinition[] = [
  {
    id: 'history.undo',
    summary: 'Undo last action',
    description: 'Reverts the last change made to the grid.',
    keybindings: [{ key: 'u', when: 'normal' }],
    patterns: [
      { pattern: 'undo', help: 'undo last action' },
      { pattern: 'u', help: 'undo last action' },
    ],
    handler: ({ engine }) => {
      engine.undo();
      return { ok: true, msg: 'undo' };
    },
  },
  {
    id: 'history.redo',
    summary: 'Redo last action',
    description: 'Re-applies the last change that was undone.',
    keybindings: [{ key: 'ctrl+r', when: 'global' }],
    patterns: [
      { pattern: 'redo', help: 'redo last action' },
      { pattern: 'r', help: 'redo last action' },
    ],
    handler: ({ engine }) => {
      engine.redo();
      return { ok: true, msg: 'redo' };
    },
  },
];