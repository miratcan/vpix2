import type { CommandDefinition } from './common';
import { ensureCount } from './common';

import type VPixEngine from '../engine';
import type { MotionKind } from './common';

const runMotion = (engine: VPixEngine, motion: MotionKind, count: unknown): string => {
  engine.applyMotion(motion, ensureCount(count));
  engine.clearPrefix();
  const motionLabels: Record<MotionKind, string> = {
    'word-next': 'w→',
    'word-prev': '←w',
    'word-end-next': 'e→',
    'word-end-prev': '←e',
    'line-begin': '⇤',
    'line-first-nonblank': '^',
    'line-end': '⇥',
    'canvas-begin': '⇱',
    'canvas-end': '⇲',
  };
  return motionLabels[motion] || motion;
};

export const axisCommands: CommandDefinition[] = [
  {
    id: 'axis.toggle',
    summary: 'Toggle movement axis (horizontal/vertical)',
    handler: ({ engine }) => {
      const oldAxis = engine.axis;
      engine.toggleAxis();
      const newAxis = engine.axis;
      return `Axis: ${newAxis === 'vertical' ? 'vertical' : 'horizontal'}`;
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
        return `Axis: ${v}`;
      }
      return 'Invalid axis';
    },
    patterns: [{ pattern: 'axis set {value:oneof[horizontal|vertical]}', help: 'axis set <horizontal|vertical>' }],
  },
  {
    id: 'cursor.move-left',
    summary: 'Move cursor left',
    handler: ({ engine }, { count }) => {
      const c = ensureCount(count);
      engine.move(-1, 0, c);
      return `← ${c}`;
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
      return `→ ${c}`;
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
      return `↑ ${c}`;
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
      return `↓ ${c}`;
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
];
