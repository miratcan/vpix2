import { type CommandDefinition } from './common';

export const clipboardCommands: CommandDefinition[] = [
  {
    id: 'clipboard.paste',
    summary: 'Paste from clipboard',
    description: 'Pastes the content of the clipboard at the cursor position.',
    keybindings: [{ key: 'p', when: 'normal' }],
    patterns: [{ pattern: 'paste', help: 'paste from clipboard' }],
    handler: ({ engine }) => {
      engine.pasteAtCursor();
      return { ok: true, msg: 'pasted' };
    },
  },
  {
    id: 'clipboard.paste-transparent',
    summary: 'Paste from clipboard (transparent)',
    description: 'Pastes the content of the clipboard, ignoring empty pixels.',
    keybindings: [{ key: 'P', when: 'normal' }],
    patterns: [{ pattern: 'paste-transparent', help: 'paste from clipboard (transparent)' }],
    handler: ({ engine }) => {
      engine.pasteAtCursorTransparent();
      return { ok: true, msg: 'pasted (transparent)' };
    },
  },
];