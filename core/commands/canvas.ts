import type { CommandDefinition } from './common';

export const canvasCommands: CommandDefinition[] = [
  {
    id: 'canvas.set-width',
    summary: 'Set canvas width',
    handler: ({ engine }, { value }) => {
      engine.setWidth(Number(value));
      return { msg: '', meta: { silent: true, closeTerminal: true } };
    },
    patterns: [{ pattern: 'set W {value:int[1..256]}', help: 'set W <int(1..256)>' }],
  },
  {
    id: 'canvas.set-height',
    summary: 'Set canvas height',
    handler: ({ engine }, { value }) => {
      engine.setHeight(Number(value));
      return { msg: '', meta: { silent: true, closeTerminal: true } };
    },
    patterns: [{ pattern: 'set H {value:int[1..256]}', help: 'set H <int(1..256)>' }],
  },
  {
    id: 'canvas.set-size',
    summary: 'Set canvas size',
    handler: ({ engine }, { size }) => {
      const dims = size as { w: number; h: number };
      engine.setSize(dims.w, dims.h);
      return { msg: '', meta: { silent: true, closeTerminal: true } };
    },
    patterns: [{ pattern: 'set size {size:size}', help: 'set size <WxH>' }],
  },
];
