import type { CommandDefinition } from './common';

export const canvasCommands: CommandDefinition[] = [
  {
    id: 'canvas.clear',
    summary: 'Clear canvas (erase all cells)',
    handler: ({ engine }) => {
      engine.clearCanvas();
      return 'Canvas cleared.';
    },
    patterns: [{ pattern: 'clear', help: 'clear' }],
  },
  {
    id: 'canvas.set-width',
    summary: 'Set canvas width',
    handler: ({ engine }, { value }) => {
      const w = Number(value);
      engine.setWidth(w);
      return { msg: `Canvas width set to ${w} pixels.`, meta: { closeTerminal: true } };
    },
    patterns: [{ pattern: 'set W {value:int[1..256]}', help: 'set W <int(1..256)>' }],
  },
  {
    id: 'canvas.set-height',
    summary: 'Set canvas height',
    handler: ({ engine }, { value }) => {
      const h = Number(value);
      engine.setHeight(h);
      return { msg: `Canvas height set to ${h} pixels.`, meta: { closeTerminal: true } };
    },
    patterns: [{ pattern: 'set H {value:int[1..256]}', help: 'set H <int(1..256)>' }],
  },
  {
    id: 'canvas.set-size',
    summary: 'Set canvas size',
    handler: ({ engine }, { size }) => {
      const dims = size as { w: number; h: number };
      engine.setSize(dims.w, dims.h);
      return { msg: `Canvas size set to ${dims.w}x${dims.h}.`, meta: { closeTerminal: true } };
    },
    patterns: [{ pattern: 'set size {size:size}', help: 'set size <WxH>' }],
  },
];
