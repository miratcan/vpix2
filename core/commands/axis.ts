import type { CommandDefinition } from './common';
import { ensureCount } from './common';

import VPixEngine, { MODES } from '../engine';
import type { MotionKind } from './common';

const runMotion = (engine: VPixEngine, motion: MotionKind, count: unknown): string => {
  engine.applyMotion(motion, ensureCount(count));
  if (engine.mode.current === MODES.VISUAL) {
    engine.updateSelectionRect();
  }
  const motionLabels: Record<MotionKind, string> = {
    'word-next': 'Moved to start of next word.',
    'word-prev': 'Moved to start of previous word.',
    'word-end-next': 'Moved to end of word.',
    'word-end-prev': 'Moved to end of previous word.',
    'line-begin': 'Moved to start of line.',
    'line-first-nonblank': 'Moved to first non-blank pixel on line.',
    'line-end': 'Moved to end of line.',
    'canvas-begin': 'Moved to start of canvas.',
    'canvas-end': 'Moved to end of canvas.',
  };
  return motionLabels[motion] || motion;
};

export const axisCommands: CommandDefinition[] = [
  {
    id: 'axis.toggle',
    summary: 'Toggle movement axis (horizontal/vertical)',
    handler: ({ engine }) => {
      engine.toggleAxis();
      const newAxis = engine.axis;
      return `Movement axis changed to ${newAxis}.`;
    },
    patterns: [{ pattern: 'axis toggle', help: 'axis toggle' }],
  },
  {
    id: 'axis.set',
    summary: 'Set movement axis explicitly',
    handler: ({ engine }, { value }) => {
      const v = String(value);
      if (v === 'horizontal' || v === 'vertical') {
        engine.setAxis(v as any);
        return `Movement axis set to ${v}.`;
      }
      return 'Invalid axis.';
    },
    patterns: [{ pattern: 'axis set {value:oneof[horizontal|vertical]}', help: 'axis set <horizontal|vertical>' }],
  },
  {
    id: 'cursor.move-left',
    summary: 'Move cursor left',
    handler: ({ engine }, { count }) => {
      const c = ensureCount(count);
      engine.move(-1, 0, c);
      return `Cursor moved left by ${c} pixel(s).`;
    },
    patterns: [
      { pattern: 'move left', help: 'move left', mapArgs: () => ({ count: 1 }) },
      { pattern: 'move left {count:int[1..512]}', help: 'move left <count>' },
    ],
  },
  {
    id: 'cursor.move-right',
    summary: 'Move cursor right',
    handler: ({ engine }, { count }) => {
      const c = ensureCount(count);
      engine.move(1, 0, c);
      return `Cursor moved right by ${c} pixel(s).`;
    },
    patterns: [
      { pattern: 'move right', help: 'move right', mapArgs: () => ({ count: 1 }) },
      { pattern: 'move right {count:int[1..512]}', help: 'move right <count>' },
    ],
  },
  {
    id: 'cursor.move-up',
    summary: 'Move cursor up',
    handler: ({ engine }, { count }) => {
      const c = ensureCount(count);
      engine.move(0, -1, c);
      return `Cursor moved up by ${c} pixel(s).`;
    },
    patterns: [
      { pattern: 'move up', help: 'move up', mapArgs: () => ({ count: 1 }) },
      { pattern: 'move up {count:int[1..512]}', help: 'move up <count>' },
    ],
  },
  {
    id: 'cursor.move-down',
    summary: 'Move cursor down',
    handler: ({ engine }, { count }) => {
      const c = ensureCount(count);
      engine.move(0, 1, c);
      return `Cursor moved down by ${c} pixel(s).`;
    },
    patterns: [
      { pattern: 'move down', help: 'move down', mapArgs: () => ({ count: 1 }) },
      { pattern: 'move down {count:int[1..512]}', help: 'move down <count>' },
    ],
  },
  {
    id: 'motion.word-next',
    summary: 'Move to next run start along axis',
    handler: ({ engine }, { count }) => {
      return runMotion(engine, 'word-next', count);
    },
    patterns: [{ pattern: 'motion word-next {count:int[1..512]}', help: 'motion word-next <count>' }],
    hidden: true,
  },
  {
    id: 'motion.word-prev',
    summary: 'Move to previous run start along axis',
    handler: ({ engine }, { count }) => {
      return runMotion(engine, 'word-prev', count);
    },
    patterns: [{ pattern: 'motion word-prev {count:int[1..512]}', help: 'motion word-prev <count>' }],
    hidden: true,
  },
  {
    id: 'motion.word-end-next',
    summary: 'Move to end of current/next run along axis',
    handler: ({ engine }, { count }) => {
      return runMotion(engine, 'word-end-next', count);
    },
    patterns: [{ pattern: 'motion word-end-next {count:int[1..512]}', help: 'motion word-end-next <count>' }],
    hidden: true,
  },
  {
    id: 'motion.word-end-prev',
    summary: 'Move to end of previous run along axis',
    handler: ({ engine }, { count }) => {
      return runMotion(engine, 'word-end-prev', count);
    },
    patterns: [{ pattern: 'motion word-end-prev {count:int[1..512]}', help: 'motion word-end-prev <count>' }],
    hidden: true,
  },
  {
    id: 'motion.line-begin',
    summary: 'Move to beginning of line/column along axis',
    handler: ({ engine }) => {
      return runMotion(engine, 'line-begin', 1);
    },
    patterns: [{ pattern: 'motion line-begin', help: 'motion line-begin' }],
    hidden: true,
  },
  {
    id: 'motion.line-first-nonblank',
    summary: 'Move to first filled cell along axis',
    handler: ({ engine }) => {
      return runMotion(engine, 'line-first-nonblank', 1);
    },
    patterns: [{ pattern: 'motion line-first-nonblank', help: 'motion line-first-nonblank' }],
    hidden: true,
  },
  {
    id: 'motion.line-end',
    summary: 'Move to end of line/column along axis',
    handler: ({ engine }) => {
      return runMotion(engine, 'line-end', 1);
    },
    patterns: [{ pattern: 'motion line-end', help: 'motion line-end' }],
    hidden: true,
  },
  {
    id: 'motion.canvas-begin',
    summary: 'Move to canvas beginning respecting axis',
    handler: ({ engine }) => {
      return runMotion(engine, 'canvas-begin', 1);
    },
    patterns: [{ pattern: 'motion canvas-begin', help: 'motion canvas-begin' }],
    hidden: true,
  },
  {
    id: 'motion.canvas-end',
    summary: 'Move to canvas end respecting axis',
    handler: ({ engine }) => {
      return runMotion(engine, 'canvas-end', 1);
    },
    patterns: [{ pattern: 'motion canvas-end', help: 'motion canvas-end' }],
    hidden: true,
  },
  {
    id: 'cursor.page-down',
    summary: 'Move cursor half page forward along axis',
    handler: ({ engine }, { viewportSize }) => {
      const size = typeof viewportSize === 'number' && viewportSize > 0 ? viewportSize : 10;
      const distance = Math.max(1, Math.floor(size / 2));
      if (engine.axis === 'horizontal') {
        engine.move(distance, 0, 1);
        return `Cursor moved right ${distance} pixels (half page).`;
      } else {
        engine.move(0, distance, 1);
        return `Cursor moved down ${distance} pixels (half page).`;
      }
    },
    patterns: [{ pattern: 'cursor page-down', help: 'cursor page-down' }],
    hidden: true,
  },
  {
    id: 'cursor.page-up',
    summary: 'Move cursor half page backward along axis',
    handler: ({ engine }, { viewportSize }) => {
      const size = typeof viewportSize === 'number' && viewportSize > 0 ? viewportSize : 10;
      const distance = Math.max(1, Math.floor(size / 2));
      if (engine.axis === 'horizontal') {
        engine.move(-distance, 0, 1);
        return `Cursor moved left ${distance} pixels (half page).`;
      } else {
        engine.move(0, -distance, 1);
        return `Cursor moved up ${distance} pixels (half page).`;
      }
    },
    patterns: [{ pattern: 'cursor page-up', help: 'cursor page-up' }],
    hidden: true,
  },
  {
    id: 'cursor.page-forward',
    summary: 'Move cursor full page forward along axis',
    handler: ({ engine }, { viewportSize }) => {
      const size = typeof viewportSize === 'number' && viewportSize > 0 ? viewportSize : 10;
      const distance = Math.max(1, size);
      if (engine.axis === 'horizontal') {
        engine.move(distance, 0, 1);
        return `Cursor moved right ${distance} pixels (full page).`;
      } else {
        engine.move(0, distance, 1);
        return `Cursor moved down ${distance} pixels (full page).`;
      }
    },
    patterns: [{ pattern: 'cursor page-forward', help: 'cursor page-forward' }],
    hidden: true,
  },
  {
    id: 'cursor.page-backward',
    summary: 'Move cursor full page backward along axis',
    handler: ({ engine }, { viewportSize }) => {
      const size = typeof viewportSize === 'number' && viewportSize > 0 ? viewportSize : 10;
      const distance = Math.max(1, size);
      if (engine.axis === 'horizontal') {
        engine.move(-distance, 0, 1);
        return `Cursor moved left ${distance} pixels (full page).`;
      } else {
        engine.move(0, -distance, 1);
        return `Cursor moved up ${distance} pixels (full page).`;
      }
    },
    patterns: [{ pattern: 'cursor page-backward', help: 'cursor page-backward' }],
    hidden: true,
  },
];
