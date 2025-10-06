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
    },
    patterns: [{ pattern: 'paste transparent', help: 'paste transparent' }],
  },
  {
    id: 'selection.rotate-cw',
    summary: 'Rotate clipboard clockwise',
    handler: ({ engine }) => {
      engine.rotateClipboardCW();
    },
    patterns: [{ pattern: 'selection rotate-cw', help: 'selection rotate-cw' }],
  },
  {
    id: 'selection.rotate-ccw',
    summary: 'Rotate clipboard counterclockwise',
    handler: ({ engine }) => {
      engine.rotateClipboardCCW();
    },
    patterns: [{ pattern: 'selection rotate-ccw', help: 'selection rotate-ccw' }],
  },
];
