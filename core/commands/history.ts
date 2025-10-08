import type { CommandDefinition } from './common';

export const historyCommands: CommandDefinition[] = [
  {
    id: 'history.undo',
    summary: 'Undo last action',
    handler: ({ engine }) => {
      engine.undo();
      return 'Last action was undone.';
    },
    patterns: [{ pattern: 'undo', help: 'undo' }],
  },
  {
    id: 'history.redo',
    summary: 'Redo last undone action',
    handler: ({ engine }) => {
      engine.redo();
      return 'Last undone action was redone.';
    },
    patterns: [{ pattern: 'redo', help: 'redo' }],
  },
];
