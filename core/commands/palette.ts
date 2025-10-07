import type { CommandDefinition } from './common';

export const paletteCommands: CommandDefinition[] = [
  {
    id: 'palette.apply',
    summary: 'Apply palette by slug',
    handler: ({ engine, services }, { slug }) => {
      const applied = services.palettes.applyPalette(engine, String(slug));
      if (!applied) return `unknown palette: ${slug}`;
      return { msg: '', meta: { silent: true, closeTerminal: true } };
    },
    patterns: [{ pattern: 'set palette {slug:slug}', help: 'set palette <slug>' }],
  },
  {
    id: 'palette.use',
    summary: 'Apply palette by slug',
    handler: ({ engine, services }, { slug }) => {
      const applied = services.palettes.applyPalette(engine, String(slug));
      if (!applied) return `unknown palette: ${slug}`;
      return { msg: '', meta: { silent: true, closeTerminal: true } };
    },
    patterns: [{ pattern: 'palette use {slug:slug}', help: 'palette use <slug>' }],
  },
  {
    id: 'palette.list',
    summary: 'List available palette slugs',
    handler: ({ services }) => {
      const names = services.palettes.listRegistrySlugs();
      return names.length ? `palettes: ${names.join(', ')}` : 'no palettes';
    },
    patterns: [{ pattern: 'palette list', help: 'palette list' }],
  },
  {
    id: 'palette.fetch',
    summary: 'Fetch palette from LoSpec',
    handler: async ({ services }, { slug }) => {
      const pal = await services.palettes.fetchPalette(String(slug), services.fetch);
      return pal ? `loaded: ${pal.slug} (${pal.colors.length})` : `failed to load: ${String(slug)}`;
    },
    patterns: [{ pattern: 'palette fetch {slug:slug}', help: 'palette fetch <slug>' }],
  },
  {
    id: 'palette.search',
    summary: 'Search palettes on LoSpec',
    handler: async ({ services }, { term }) => {
      const results = await services.palettes.searchRemote(String(term), services.fetch);
      return results.length ? results.join(', ') : 'no results';
    },
    patterns: [{ pattern: 'palette search {term:rest}', help: 'palette search <term>' }],
  },
  {
    id: 'palette.swap-last-color',
    summary: 'Swap with previously used palette color',
    handler: ({ engine }) => {
      engine.swapToLastColor();
      return `Swapped color`;
    },
    patterns: [{ pattern: 'palette swap-last', help: 'palette swap-last' }],
  },
  {
    id: 'palette.select-index',
    summary: 'Select palette color by index',
    handler: ({ engine }, { index }) => {
      const paletteLength = engine.palette.length;
      if (!paletteLength) return 'No palette';
      const idx = Math.min(paletteLength, Math.max(1, Number(index ?? 1)));
      engine.setColorIndex(idx - 1);
      engine.clearPrefix();
      return `Color ${idx}`;
    },
    patterns: [{ pattern: 'palette select {index:int[1..512]}', help: 'palette select <index>' }],
  },
  {
    id: 'palette.paint-color',
    summary: 'Paint using palette color index',
    handler: ({ engine }, { index }) => {
      const paletteIndex = Math.max(1, Number(index ?? 1)) - 1;
      if (paletteIndex >= 0 && paletteIndex < engine.palette.length) {
        engine.paint(paletteIndex);
        engine.recordLastAction((eng) => {
          eng.paint(paletteIndex);
        });
      }
      engine.clearPrefix();
      return `Painted #${Number(index)}`;
    },
    patterns: [{ pattern: 'paint color {index:int[1..512]}', help: 'paint color <index>' }],
  },
  {
    id: 'palette.cycle-next',
    summary: 'Select next palette color',
    handler: ({ engine }) => {
      if (!engine.palette.length) return 'No palette';
      const next = (engine.currentColorIndex + 1) % engine.palette.length;
      engine.setColorIndex(next);
      engine.clearPrefix();
      return `Color ${next + 1}`;
    },
    patterns: [{ pattern: 'palette next', help: 'palette next' }],
  },
  {
    id: 'palette.cycle-previous',
    summary: 'Select previous palette color',
    handler: ({ engine }) => {
      if (!engine.palette.length) return 'No palette';
      const prev = (engine.currentColorIndex - 1 + engine.palette.length) % engine.palette.length;
      engine.setColorIndex(prev);
      engine.clearPrefix();
      return `Color ${prev + 1}`;
    },
    patterns: [{ pattern: 'palette prev', help: 'palette prev' }],
  },
];
