import type VPixEngine from './engine';

export type BindingScope = 'global' | 'normal' | 'visual';
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
  tips?: string[];
};

const clampCount = (count: number) => (Number.isFinite(count) && count > 0 ? count : 1);

export const KEYBINDINGS: KeyBinding[] = [
  // General tips (not bound to any key)
  {
    scope: 'global',
    key: '__general__',
    command: 'noop',
    description: 'General tips',
    tips: [
      'Having issues? Open an issue at github.com/miratcan/vpix2',
      'Love the project? Star us on GitHub at github.com/miratcan/vpix2',
      'Press Ctrl+` to toggle terminal',
      'Press ? to see all available commands',
      'Type :help for full command list',
    ],
  },

  // Global bindings
  {
    scope: 'global',
    key: 'ctrl+d',
    command: 'cursor.page-down',
    description: 'Scroll half page forward (axis-aware)',
    tips: ['Press Ctrl+d to scroll half page forward', 'Press Ctrl+u to scroll half page backward', 'Axis determines scroll direction'],
  },
  {
    scope: 'global',
    key: 'ctrl+u',
    command: 'cursor.page-up',
    description: 'Scroll half page backward (axis-aware)',
  },
  {
    scope: 'global',
    key: 'ctrl+f',
    command: 'cursor.page-forward',
    description: 'Scroll full page forward (axis-aware)',
    tips: ['Press Ctrl+f to scroll full page forward', 'Press Ctrl+b to scroll full page backward'],
  },
  {
    scope: 'global',
    key: 'ctrl+b',
    command: 'cursor.page-backward',
    description: 'Scroll full page backward (axis-aware)',
  },
  // Aliases removed for Zen: [ctrl+y]
  {
    scope: 'global',
    key: 'ctrl+r',
    command: 'history.redo',
    description: 'Redo last action',
    tips: ['Press Ctrl+r to redo'],
  },
  // Aliases removed for Zen: [ctrl+6]
  { scope: 'global', key: 'ctrl+^', command: 'palette.swap-last-color', description: 'Swap to last used color' },
  {
    scope: 'global',
    key: 'Tab',
    command: 'axis.toggle',
    description: 'Toggle axis (horizontal/vertical)',
    tips: ['Use Tab to toggle axis (horizontal/vertical)', 'Press | to switch to vertical axis', 'Press - to switch to horizontal axis'],
  },

  // Normal mode bindings
  {
    scope: 'normal',
    key: 'h',
    command: 'cursor.move-left',
    when: 'no-prefix',
    args: ({ count }) => ({ count: clampCount(count) }),
    description: 'Move cursor left',
    tips: ['Use hjkl for vim-like navigation'],
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
    key: 'w',
    command: 'motion.word-next',
    when: 'no-prefix',
    args: ({ count }) => ({ count: clampCount(count) }),
    description: 'Move to next run start',
    tips: ['Use w/b to jump between color runs', 'Press e to jump to end of color run'],
  },
  {
    scope: 'normal',
    key: 'b',
    command: 'motion.word-prev',
    when: 'no-prefix',
    args: ({ count }) => ({ count: clampCount(count) }),
    description: 'Move to previous run start',
  },
  {
    scope: 'normal',
    key: 'e',
    command: 'motion.word-end-next',
    when: 'no-prefix',
    args: ({ count }) => ({ count: clampCount(count) }),
    description: 'Move to end of run',
  },
  {
    scope: 'normal',
    key: '0',
    command: 'motion.line-begin',
    when: 'no-prefix',
    description: 'Go to axis line begin',
    tips: ['Press 0 to go to start of line/column'],
  },
  {
    scope: 'normal',
    key: '^',
    command: 'motion.line-first-nonblank',
    when: 'no-prefix',
    description: 'Go to first non-empty cell on axis line',
  },
  {
    scope: 'normal',
    key: '$',
    command: 'motion.line-end',
    when: 'no-prefix',
    description: 'Go to axis line end',
    tips: ['Press $ to go to end of line/column'],
  },
  {
    scope: 'normal',
    key: 'shift+g',
    command: 'motion.canvas-end',
    when: 'no-prefix',
    description: 'Go to canvas end',
    tips: ['Press G to go to canvas end', 'Axis determines movement direction'],
  },
  {
    scope: 'normal',
    key: 'x',
    command: 'paint.cut',
    when: 'no-prefix',
    args: ({ count }) => ({ count: clampCount(count) }),
    description: 'Cut cell(s) (delete and yank)',
    tips: ['Press x to cut pixel (delete and yank)'],
  },
  {
    scope: 'normal',
    key: 'd',
    command: 'operator.set',
    when: 'no-prefix',
    args: ({ count }) => ({ value: 'delete', count: clampCount(count) }),
    description: 'Begin delete operator',
    tips: ['Press d then motion to delete range', 'Use dd to delete line/column'],
  },
  {
    scope: 'normal',
    key: 'y',
    command: 'operator.set',
    when: 'no-prefix',
    args: ({ count }) => ({ value: 'yank', count: clampCount(count) }),
    description: 'Begin yank operator',
    tips: ['Press y then motion to yank range', 'Use yy to yank line/column', 'Yanked content goes to clipboard for pasting'],
  },
  {
    scope: 'normal',
    key: ' ',
    command: 'paint.toggle',
    when: 'no-prefix',
    args: ({ count }) => ({ count: clampCount(count) }),
    description: 'Toggle cell(s)',
    tips: ['Press Space to draw with current color'],
  },
  {
    scope: 'normal',
    key: 'f',
    command: 'selection.flood-fill',
    when: 'no-prefix',
    description: 'Flood fill from cursor',
    tips: ['Press f to bucket fill from cursor'],
  },
  {
    scope: 'normal',
    key: 'p',
    command: 'clipboard.paste',
    when: 'no-prefix',
    description: 'Paste at cursor',
    tips: ['Press p to paste at cursor'],
  },
  {
    scope: 'normal',
    key: 'shift+d',
    command: 'operator.delete.to-end',
    when: 'no-prefix',
    args: ({ count }) => ({ count: clampCount(count) }),
    description: 'Delete to line end',
  },
  {
    scope: 'normal',
    key: 'shift+c',
    command: 'operator.change.to-end',
    when: 'no-prefix',
    args: ({ count }) => ({ count: clampCount(count) }),
    description: 'Change to line end',
  },
  {
    scope: 'normal',
    key: 'P',
    command: 'clipboard.paste-transparent',
    when: 'no-prefix',
    description: 'Paste at cursor (transparent)',
    tips: ['Press P to paste transparent (skip empty)'],
  },
  // Aliases removed for Zen: [ctrl+z]
  {
    scope: 'normal',
    key: 'u',
    command: 'history.undo',
    when: 'no-prefix',
    description: 'Undo last action',
    tips: ['Press u to undo'],
  },
  {
    scope: 'normal',
    key: '.',
    command: 'edit.repeat-last',
    when: 'no-prefix',
    description: 'Repeat last change',
    tips: ['Press . to repeat last change'],
  },
  {
    scope: 'normal',
    key: 'c',
    command: 'operator.set',
    when: 'no-prefix',
    args: ({ count }) => ({ value: 'change', count: clampCount(count) }),
    description: 'Begin change operator',
  },
  {
    scope: 'normal',
    key: 'c',
    command: 'palette.select-index',
    when: 'prefix:g',
    args: ({ count, engine }) => {
      const paletteSize = engine.palette.length;
      const index = Math.min(paletteSize, Math.max(1, clampCount(count)));
      return { index };
    },
    description: 'Select palette color by count',
    tips: ['Press gc[count] to pick palette color by number'],
  },
  {
    scope: 'normal',
    key: 'v',
    command: 'mode.visual',
    when: 'no-prefix',
    description: 'Enter visual mode',
    tips: ['Press v to enter visual/select mode', 'In visual mode, use hjkl to expand selection', 'Visual mode lets you draw shapes and manipulate regions'],
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
    tips: ['Press r[1-9] to paint with palette color'],
  },
  {
    scope: 'normal',
    key: 'g',
    command: 'motion.canvas-begin',
    when: 'prefix:g',
    description: 'Go to canvas begin',
    tips: ['Press gg to go to canvas start'],
  },
  {
    scope: 'normal',
    key: 'e',
    command: 'motion.word-end-prev',
    when: 'prefix:g',
    args: ({ count }) => ({ count: clampCount(count) }),
    description: 'Move to previous run end',
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
    tips: ['Press gt/gT to cycle palette colors'],
  },
  {
    scope: 'normal',
    key: 'shift+t',
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

  // Visual mode bindings
  {
    scope: 'visual',
    key: 'Escape',
    command: 'selection.exit-visual',
    description: 'Exit visual mode',
    tips: ['Press Escape to exit visual mode'],
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
  // Aliases removed for Zen: [x]
  { scope: 'visual', key: 'd', command: 'selection.delete', description: 'Delete selection (cut)' },
  { scope: 'visual', key: 'p', command: 'selection.paste', description: 'Paste at cursor' },
  { scope: 'visual', key: 'shift+p', command: 'selection.paste-transparent', description: 'Paste (transparent)' },
  {
    scope: 'visual',
    key: ']',
    command: 'selection.rotate-cw',
    description: 'Rotate clipboard clockwise',
    tips: ['In visual: [ or ] to rotate selection'],
  },
  { scope: 'visual', key: '[', command: 'selection.rotate-ccw', description: 'Rotate clipboard counterclockwise' },
  {
    scope: 'visual',
    key: 'shift+m',
    command: 'selection.move-to-cursor',
    description: 'Move selection to cursor',
    tips: ['In visual: M to move selection to cursor'],
  },
  {
    scope: 'visual',
    key: 'shift+f',
    command: 'selection.fill',
    description: 'Fill selection',
    tips: ['In visual: F to fill selection'],
  },
  {
    scope: 'visual',
    key: 'shift+r',
    command: 'selection.stroke-rect',
    description: 'Stroke selection rectangle',
    tips: ['In visual: R to stroke rectangle'],
  },
  {
    scope: 'visual',
    key: 'shift+c',
    command: 'selection.stroke-circle',
    description: 'Stroke selection circle',
    tips: ['In visual: C to stroke circle'],
  },
  {
    scope: 'visual',
    key: 'shift+o',
    command: 'selection.fill-circle',
    description: 'Fill selection circle',
    tips: ['In visual: O to fill circle'],
  },
  {
    scope: 'visual',
    key: 'shift+l',
    command: 'selection.draw-line',
    description: 'Draw line across selection',
    tips: ['In visual: L to draw line'],
  },
  {
    scope: 'visual',
    key: 'f',
    command: 'selection.flood-fill',
    description: 'Flood fill selection',
    tips: ['In visual: f to flood fill'],
  },
];
