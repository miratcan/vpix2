import { type CommandDefinition, MODES } from './common';

export const modeCommands: CommandDefinition[] = [
  {
    id: 'mode.visual',
    summary: 'Enter visual mode',
    description: 'Enter visual mode to start a selection.',
    keybindings: [{ key: 'v', when: 'normal' }],
    patterns: [{ pattern: 'visual', help: 'enter visual mode' }],
    handler: ({ engine }) => {
      engine.enterVisual();
      return { ok: true, msg: 'visual mode' };
    },
  },
  {
    id: 'selection.exit-visual',
    summary: 'Exit visual mode',
    description: 'Exit visual mode and return to normal mode.',
    keybindings: [{ key: 'Escape', when: 'visual' }],
    patterns: [{ pattern: 'normal', help: 'exit visual mode' }],
    handler: ({ engine }) => {
      engine.exitVisual();
      return { ok: true, msg: 'normal mode' };
    },
  },
];