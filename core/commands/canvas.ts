import { type CommandDefinition } from './common';

export const canvasCommands: CommandDefinition[] = [
  {
    id: 'canvas.clear',
    summary: 'Clear the canvas',
    description: 'Clears the entire canvas, removing all pixels.',
    patterns: [{ pattern: 'clear', help: 'clear canvas' }],
    handler: ({ engine }) => {
      engine.clearCanvas();
      return { ok: true, msg: 'canvas cleared' };
    },
  },
  {
    id: 'canvas.set-width',
    summary: 'Set canvas width',
    description: 'Sets the width of the canvas, preserving content.',
    patterns: [{ pattern: 'set W {value:number}', help: 'set canvas width' }],
    handler: ({ engine }, { value }) => {
      engine.setWidth(value as number);
      return { ok: true, msg: `Canvas width set to ${value}.` };
    },
  },
  {
    id: 'canvas.set-height',
    summary: 'Set canvas height',
    description: 'Sets the height of the canvas, preserving content.',
    patterns: [{ pattern: 'set H {value:number}', help: 'set canvas height' }],
    handler: ({ engine }, { value }) => {
      engine.setHeight(value as number);
      return { ok: true, msg: `Canvas height set to ${value}.` };
    },
  },
  {
    id: 'canvas.set-size',
    summary: 'Set canvas size',
    description: 'Sets the width and height of the canvas.',
    patterns: [
      { pattern: 'set size {width:number}x{height:number}', help: 'set canvas size' },
      { pattern: 'set size {width:number} {height:number}', help: 'set canvas size' },
    ],
    handler: ({ engine }, { width, height }) => {
      engine.setSize(width as number, height as number);
      return { ok: true, msg: `Canvas size set to ${width}x${height}.`, meta: { closeTerminal: true } };
    },
  },
  {
    id: 'canvas.center',
    summary: 'Center the canvas view',
    description: 'Resets the view to center the canvas.',
    keybindings: [{ key: 'g g', when: 'normal' }],
    patterns: [{ pattern: 'center', help: 'center canvas' }],
    handler: () => {
      return { ok: true, msg: 'centering view (UI action)' };
    },
  },
];
