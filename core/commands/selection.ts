import { type CommandDefinition } from './common';

export const selectionCommands: CommandDefinition[] = [
  {
    id: 'selection.yank',
    summary: 'Yank selection',
    description: 'Copies the selected area to the clipboard.',
    keybindings: [{ key: 'y', when: 'visual' }],
    patterns: [{ pattern: 'yank', help: 'yank selection' }],
    handler: ({ engine }) => {
      engine.yankSelection();
      engine.exitVisual();
      return { ok: true, msg: 'yanked' };
    },
  },
  {
    id: 'selection.delete',
    summary: 'Delete selection (cut)',
    description: 'Deletes the selected area and copies it to the clipboard.',
    keybindings: [{ key: 'd', when: 'visual' }],
    patterns: [{ pattern: 'delete', help: 'delete selection' }],
    handler: ({ engine }) => {
      engine.deleteSelection();
      engine.exitVisual();
      return { ok: true, msg: 'deleted' };
    },
  },
  {
    id: 'selection.fill',
    summary: 'Fill selection',
    description: 'Fills the selected area with the current color.',
    keybindings: [{ key: 'F', when: 'visual' }],
    patterns: [{ pattern: 'fill', help: 'fill selection' }],
    handler: ({ engine }) => {
      engine.fillSelection();
      engine.exitVisual();
      return { ok: true, msg: 'filled' };
    },
  },
  {
    id: 'selection.stroke-rect',
    summary: 'Stroke selection rectangle',
    description: 'Draws a rectangle around the selection.',
    keybindings: [{ key: 'R', when: 'visual' }],
    patterns: [{ pattern: 'stroke-rect', help: 'stroke selection rectangle' }],
    handler: ({ engine }) => {
      engine.strokeRectSelection();
      return { ok: true, msg: 'stroked rect' };
    },
  },
];