import type VPixEngine from './engine';

export type BindingScope = 'global' | 'normal' | 'insert' | 'visual';
export type BindingCondition = 'always' | 'no-prefix' | 'prefix:any' | 'prefix:g' | 'prefix:r';

export type BindingContext = {
  engine: VPixEngine;
  event: { key: string; ctrlKey?: boolean; shiftKey?: boolean };
  count: number;
  prefix: string | null;
};

export type KeyBinding = {
  scope: BindingScope;
  key: string;
  command: string;
  when?: BindingCondition;
  args?: (ctx: BindingContext) => Record<string, unknown> | void;
  display?: string;
  description?: string;
};

const clampCount = (count: number) => (Number.isFinite(count) && count > 0 ? count : 1);

export const KEYBINDINGS: KeyBinding[] = [
  // Global bindings
  { scope: 'global', key: 'ctrl+z', command: 'history.undo', description: 'Undo last action' },
  { scope: 'global', key: 'ctrl+y', command: 'history.redo', description: 'Redo last action' },
  { scope: 'global', key: 'ctrl+6', command: 'palette.swap-last-color', description: 'Swap to last used color' },
  { scope: 'global', key: 'ctrl+^', command: 'palette.swap-last-color', description: 'Swap to last used color' },
  { scope: 'global', key: 'Tab', command: 'axis.toggle', description: 'Toggle axis (horizontal/vertical)' },

  // Normal mode bindings
  {
    scope: 'normal',
    key: 'h',
    command: 'cursor.move-left',
    when: 'no-prefix',
    args: ({ count }) => ({ count: clampCount(count) }),
    description: 'Move cursor left',
  },
  {
    scope: 'normal',
    key: 'j',
    command: 'cursor.move-down',
    when: 'no-prefix',
    args: ({ count }) => ({ count: clampCount(count) }),
    description: 'Move cursor down',
  },
  {
    scope: 'normal',
    key: 'k',
    command: 'cursor.move-up',
    when: 'no-prefix',
    args: ({ count }) => ({ count: clampCount(count) }),
    description: 'Move cursor up',
  },
  {
    scope: 'normal',
    key: 'l',
    command: 'cursor.move-right',
    when: 'no-prefix',
    args: ({ count }) => ({ count: clampCount(count) }),
    description: 'Move cursor right',
  },
  {
    scope: 'normal',
    key: 'i',
    command: 'mode.insert',
    when: 'no-prefix',
    description: 'Switch to insert mode',
  },
  {
    scope: 'normal',
    key: 'x',
    command: 'paint.cut',
    when: 'no-prefix',
    args: ({ count }) => ({ count: clampCount(count) }),
    description: 'Cut cell(s) (delete and yank)',
  },
  {
    scope: 'normal',
    key: ' ',
    command: 'paint.toggle',
    when: 'no-prefix',
    args: ({ count }) => ({ count: clampCount(count) }),
    description: 'Toggle cell(s)',
  },
  {
    scope: 'normal',
    key: 'p',
    command: 'clipboard.paste',
    when: 'no-prefix',
    description: 'Paste at cursor',
  },
  {
    scope: 'normal',
    key: 'P',
    command: 'clipboard.paste-transparent',
    when: 'no-prefix',
    description: 'Paste at cursor (transparent)',
  },
  {
    scope: 'normal',
    key: 'c',
    command: 'palette.select-index',
    when: 'no-prefix',
    args: ({ count, engine }) => {
      const paletteSize = engine.palette.length;
      const index = Math.min(paletteSize, Math.max(1, clampCount(count)));
      return { index };
    },
    description: 'Select palette color by count',
  },
  {
    scope: 'normal',
    key: 'v',
    command: 'mode.visual',
    when: 'no-prefix',
    description: 'Enter visual mode',
  },
  {
    scope: 'normal',
    key: 'g',
    command: 'prefix.set',
    when: 'no-prefix',
    args: () => ({ value: 'g' }),
    description: 'Begin g-prefix command',
  },
  {
    scope: 'normal',
    key: 'r',
    command: 'prefix.set',
    when: 'no-prefix',
    args: () => ({ value: 'r' }),
    description: 'Begin r-prefix command',
  },
  {
    scope: 'normal',
    key: 'Escape',
    command: 'prefix.clear',
    when: 'prefix:any',
    description: 'Cancel pending prefix',
  },
  {
    scope: 'normal',
    key: 't',
    command: 'palette.cycle-next',
    when: 'prefix:g',
    description: 'Cycle to next palette color',
  },
  {
    scope: 'normal',
    key: 'T',
    command: 'palette.cycle-previous',
    when: 'prefix:g',
    description: 'Cycle to previous palette color',
  },
  {
    scope: 'normal',
    key: '[1-9]',
    display: '1..9',
    command: 'palette.paint-color',
    when: 'prefix:r',
    args: ({ event }) => ({ index: parseInt(event.key, 10) }),
    description: 'Paint using palette color by index',
  },

  // Insert mode bindings
  {
    scope: 'insert',
    key: 'Escape',
    command: 'mode.normal',
    description: 'Return to normal mode',
  },
  {
    scope: 'insert',
    key: 'h',
    command: 'cursor.move-left',
    args: ({ count }) => ({ count: clampCount(count) }),
    description: 'Move cursor left',
  },
  {
    scope: 'insert',
    key: 'j',
    command: 'cursor.move-down',
    args: ({ count }) => ({ count: clampCount(count) }),
    description: 'Move cursor down',
  },
  {
    scope: 'insert',
    key: 'k',
    command: 'cursor.move-up',
    args: ({ count }) => ({ count: clampCount(count) }),
    description: 'Move cursor up',
  },
  {
    scope: 'insert',
    key: 'l',
    command: 'cursor.move-right',
    args: ({ count }) => ({ count: clampCount(count) }),
    description: 'Move cursor right',
  },
  {
    scope: 'insert',
    key: ' ',
    command: 'paint.apply',
    description: 'Paint current cell',
  },
  {
    scope: 'insert',
    key: 'Backspace',
    command: 'paint.erase',
    args: () => ({ count: 1 }),
    description: 'Erase current cell',
  },

  // Visual mode bindings
  {
    scope: 'visual',
    key: 'Escape',
    command: 'selection.exit-visual',
    description: 'Exit visual mode',
  },
  {
    scope: 'visual',
    key: 'h',
    command: 'selection.move-left',
    args: ({ count }) => ({ count: clampCount(count) }),
    description: 'Shrink selection to the left',
  },
  {
    scope: 'visual',
    key: 'j',
    command: 'selection.move-down',
    args: ({ count }) => ({ count: clampCount(count) }),
    description: 'Expand selection downward',
  },
  {
    scope: 'visual',
    key: 'k',
    command: 'selection.move-up',
    args: ({ count }) => ({ count: clampCount(count) }),
    description: 'Expand selection upward',
  },
  {
    scope: 'visual',
    key: 'l',
    command: 'selection.move-right',
    args: ({ count }) => ({ count: clampCount(count) }),
    description: 'Expand selection to the right',
  },
  { scope: 'visual', key: 'y', command: 'selection.yank', description: 'Yank selection' },
  { scope: 'visual', key: 'd', command: 'selection.delete', description: 'Delete selection (cut)' },
  { scope: 'visual', key: 'x', command: 'selection.delete', description: 'Delete selection (cut)' },
  { scope: 'visual', key: 'p', command: 'selection.paste', description: 'Paste at cursor' },
  { scope: 'visual', key: 'P', command: 'selection.paste-transparent', description: 'Paste (transparent)' },
  { scope: 'visual', key: ']', command: 'selection.rotate-cw', description: 'Rotate clipboard clockwise' },
  { scope: 'visual', key: '[', command: 'selection.rotate-ccw', description: 'Rotate clipboard counterclockwise' },
  { scope: 'visual', key: 'M', command: 'selection.move-to-cursor', description: 'Move selection to cursor' },
  { scope: 'visual', key: 'F', command: 'selection.fill', description: 'Fill selection' },
  { scope: 'visual', key: 'R', command: 'selection.stroke-rect', description: 'Stroke selection rectangle' },
  { scope: 'visual', key: 'L', command: 'selection.draw-line', description: 'Draw line across selection' },
  { scope: 'visual', key: 'f', command: 'selection.flood-fill', description: 'Flood fill selection' },
];
