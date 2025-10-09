import { type CommandDefinition } from './common';

export const gridCommands: CommandDefinition[] = [
  {
    id: 'grid.clear',
    summary: 'Clear the grid',
    description: 'Clears the entire grid, removing all pixels.',
    patterns: [{ pattern: 'clear', help: 'clear grid' }],
    handler: ({ engine }) => {
      engine.clearGrid();
      return { ok: true, msg: 'grid cleared' };
    },
  },
  {
    id: 'grid.set-width',
    summary: 'Set grid width',
    description: 'Sets the width of the grid, preserving content.',
    patterns: [{ pattern: 'set W {value:number}', help: 'set grid width' }],
    handler: ({ engine }, { value }) => {
      engine.setWidth(value as number);
      return { ok: true, msg: `Grid width set to ${value}.` };
    },
  },
  {
    id: 'grid.set-height',
    summary: 'Set grid height',
    description: 'Sets the height of the grid, preserving content.',
    patterns: [{ pattern: 'set H {value:number}', help: 'set grid height' }],
    handler: ({ engine }, { value }) => {
      engine.setHeight(value as number);
      return { ok: true, msg: `Grid height set to ${value}.` };
    },
  },
  {
    id: 'grid.set-size',
    summary: 'Set grid size',
    description: 'Sets the width and height of the grid.',
    patterns: [
      { pattern: 'set size {width:number}x{height:number}', help: 'set grid size' },
      { pattern: 'set size {width:number} {height:number}', help: 'set grid size' },
    ],
    handler: ({ engine }, { width, height }) => {
      engine.setSize(width as number, height as number);
      return { ok: true, msg: `Grid size set to ${width}x${height}.`, meta: { closeTerminal: true } };
    },
  },
  {
    id: 'grid.center',
    summary: 'Center the grid view',
    description: 'Resets the view to center the grid.',
    keybindings: [{ key: 'ggc', when: 'normal' }],
    patterns: [{ pattern: 'center', help: 'center grid' }],
    handler: () => {
      return { ok: true, msg: 'centering view (UI action)' };
    },
  },
];
