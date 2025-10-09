import { getPaletteByName, getPaletteNames } from '../palettes';
import { type CommandDefinition } from './common';

export const paletteCommands: CommandDefinition[] = [
  {
    id: 'palette.use',
    summary: 'Use a named palette',
    description: 'Switches the active palette to a registered named palette.',
    patterns: [{ pattern: 'palette use {name:string}', help: 'palette use <name>' }],
    handler: ({ engine }, { name }) => {
      const palette = getPaletteByName(name as string);
      if (!palette) return { ok: false, msg: `palette not found: ${name}` };
      engine.setPalette(palette.colors);
      return { ok: true, msg: `palette set to ${name}` };
    },
  },
  {
    id: 'palette.list',
    summary: 'List available palettes',
    description: 'Lists all registered color palettes.',
    patterns: [{ pattern: 'palette list', help: 'list available palettes' }],
    handler: () => {
      const names = getPaletteNames();
      return { ok: true, msg: 'palettes listed', meta: { lines: names } };
    },
  },
  {
    id: 'palette.swap-last-color',
    summary: 'Swap to last used color',
    description: 'Swaps the current color with the previously used color.',
    keybindings: [{ key: 'ctrl+^', when: 'global' }],
    patterns: [{ pattern: 'swap-color', help: 'swap to last used color' }],
    handler: ({ engine }) => {
      engine.swapToLastColor();
      return { ok: true, msg: 'swapped color' };
    },
  },
  {
    id: 'palette.cycle-next',
    summary: 'Cycle to next palette color',
    description: 'Selects the next color in the palette.',
    keybindings: [{ key: 'g t', when: 'normal' }],
    patterns: [{ pattern: 'cycle-next', help: 'cycle to next palette color' }],
    handler: ({ engine }) => {
      const next = (engine.currentColorIndex + 1) % engine.palette.length;
      engine.setColorIndex(next);
      return { ok: true, msg: `color set to ${next}` };
    },
  },
  {
    id: 'palette.cycle-previous',
    summary: 'Cycle to previous palette color',
    description: 'Selects the previous color in the palette.',
    keybindings: [{ key: 'g T', when: 'normal' }],
    patterns: [{ pattern: 'cycle-prev', help: 'cycle to previous palette color' }],
    handler: ({ engine }) => {
      const prev = (engine.currentColorIndex - 1 + engine.palette.length) % engine.palette.length;
      engine.setColorIndex(prev);
      return { ok: true, msg: `color set to ${prev}` };
    },
  },
  {
    id: 'palette.select-index',
    summary: 'Select palette color by index',
    description: 'Selects a palette color by index using the grid command.',
    patterns: [{ pattern: 'gc {index:number}', help: 'gc <index>' }],
    handler: ({ engine }, { index }) => {
      const idx = Number(index) - 1;
      if (!Number.isFinite(idx)) {
        return { ok: false, msg: 'invalid color index' };
      }
      if (idx < 0 || idx >= engine.palette.length) {
        return { ok: false, msg: `color index out of range: ${Number(index)}` };
      }
      engine.setColorIndex(idx);
      return { ok: true, msg: `color set to ${idx}` };
    },
  },
];
