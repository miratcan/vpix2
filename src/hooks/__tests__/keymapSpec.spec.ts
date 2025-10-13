import { describe, expect, it } from 'vitest';

import { buildKeymapFromSpec } from '../keymapSpec';

describe('keymap spec', () => {
  const keymap = buildKeymapFromSpec();

  it('maps core movement keys in normal mode', () => {
    const normal = keymap.get('normal');
    expect(normal?.get('h')).toBe('cursor.move-left');
    expect(normal?.get('arrowleft')).toBe('cursor.move-left');
    expect(normal?.get('space')).toBe('paint.apply');
  });

  it('includes prefix combinations for g-prefixed commands', () => {
    const normal = keymap.get('normal');
    expect(normal?.get('g+g')).toBe('motion.canvas-begin');
    expect(normal?.get('g+shift+t')).toBe('palette.cycle-previous');
  });

  it('binds visual mode yank and delete helpers', () => {
    const visual = keymap.get('visual');
    expect(visual?.get('y')).toBe('selection.yank');
    expect(visual?.get('d')).toBe('selection.delete');
    expect(visual?.get('x')).toBe('selection.delete');
  });

  it('provides global aliases', () => {
    const global = keymap.get('global');
    expect(global?.get('ctrl+d')).toBe('cursor.page-down');
    expect(global?.get('shift+|')).toBe('view.toggle-crosshair');
  });
});
