import type { CommandDefinition } from './common';

export const clipboardCommands: CommandDefinition[] = [
  {
    id: 'clipboard.paste',
    summary: 'Paste clipboard at cursor (normal mode)',
    handler: ({ engine }) => {
      engine.pasteAtCursor();
      engine.recordLastAction((eng) => {
        eng.pasteAtCursor();
      });
      engine.clearPrefix();
      return 'Pasted content from clipboard at cursor.';
    },
    patterns: [{ pattern: 'paste', help: 'paste' }],
  },
  {
    id: 'clipboard.paste-transparent',
    summary: 'Paste clipboard transparently (normal mode)',
    handler: ({ engine }) => {
      engine.pasteAtCursorTransparent();
      engine.recordLastAction((eng) => {
        eng.pasteAtCursorTransparent();
      });
      engine.clearPrefix();
      return 'Pasted content from clipboard transparently.';
    },
    patterns: [{ pattern: 'paste transparent', help: 'paste transparent' }],
  },
  {
    id: 'selection.rotate-cw',
    summary: 'Rotate selection clockwise',
    handler: ({ engine }) => {
      engine.rotateSelectionCW();
      return 'Rotated selection clockwise.';
    },
    patterns: [{ pattern: 'selection rotate-cw', help: 'selection rotate-cw' }],
  },
  {
    id: 'selection.rotate-ccw',
    summary: 'Rotate selection counterclockwise',
    handler: ({ engine }) => {
      engine.rotateSelectionCCW();
      return 'Rotated selection counter-clockwise.';
    },
    patterns: [{ pattern: 'selection rotate-ccw', help: 'selection rotate-ccw' }],
  },
];
