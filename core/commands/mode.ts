import type { CommandDefinition, CommandContext } from './common';
import { ensureCount, MODES } from './common';

import type { MotionKind, OperatorKind } from './common';

const applyOperator = (
  engine: CommandContext['engine'],
  op: OperatorKind,
  motion: MotionKind,
  operatorCount: number,
  motionCount: number,
) => {
  const total = ensureCount(operatorCount) * ensureCount(motionCount);
  const startPoint = { x: engine.cursor.x, y: engine.cursor.y };
  const effectiveMotion = op === 'change' && motion === 'word-next' ? 'word-end-next' : motion;
  const motionResult = engine.resolveMotion(effectiveMotion, total, startPoint);
  const segment = engine.computeOperatorSegment(startPoint, motionResult);
  engine.clearPrefix();
  if (!segment) {
    engine.cursor.x = motionResult.target.x;
    engine.cursor.y = motionResult.target.y;
    if (motionResult.moved) engine.emit();
    engine.recordLastAction(null);
    return;
  }

  const axis = segment.axis;
  const anchor = axis === 'horizontal' ? startPoint.x : startPoint.y;
  const fixed = axis === 'horizontal' ? startPoint.y : startPoint.x;
  const startOffset = segment.start - anchor;
  const endOffset = segment.end - anchor;
  const cursorPoint = axis === 'horizontal' ? { x: segment.start, y: fixed } : { x: fixed, y: segment.start };
  engine.cursor.x = cursorPoint.x;
  engine.cursor.y = cursorPoint.y;

  if (op === 'yank') {
    engine.yankSegment(segment);
    engine.emit();
    engine.recordLastAction(null);
    return;
  }

  const applyDelete = () => engine.deleteSegment(segment);

  const recordRepeat = () => {
    engine.recordLastAction((eng) => {
      const currentFixed = axis === 'horizontal' ? eng.cursor.y : eng.cursor.x;
      const currentAnchor = axis === 'horizontal' ? eng.cursor.x : eng.cursor.y;
      const repeatSegment = eng.createSegmentFromOffsets(axis, currentFixed, currentAnchor, startOffset, endOffset);
      const repeatCursor =
        axis === 'horizontal'
          ? { x: repeatSegment.start, y: currentFixed }
          : { x: currentFixed, y: repeatSegment.start };
      eng.cursor.x = repeatCursor.x;
      eng.cursor.y = repeatCursor.y;
      const changedAgain = eng.deleteSegment(repeatSegment);
      if (!changedAgain) {
        eng.emit();
      }
    });
  };

  const changed = applyDelete();

  if (changed) {
    recordRepeat();
  } else {
    engine.recordLastAction(null);
    engine.emit();
  }
};

const applyPendingOperator = (engine: CommandContext['engine'], motion: MotionKind | string, motionCount: number) => {
  const pending = engine.pendingOperator;
  if (!pending) return;
  engine.clearPendingOperator();
  const motionId = String(motion);
  const normalized = motionId.startsWith('motion.')
    ? (motionId.slice('motion.'.length) as MotionKind)
    : (motionId as MotionKind);
  applyOperator(engine, pending.op, normalized, pending.count, motionCount);
};

export const modeCommands: CommandDefinition[] = [
  {
    id: 'mode.normal',
    summary: 'Switch to normal mode',
    handler: ({ engine }) => {
      engine.setMode(MODES.NORMAL);
      engine.clearPrefix();
      return 'Normal mode';
    },
    patterns: [
      { pattern: 'mode normal', help: 'mode normal' },
      { pattern: 'normal', help: 'normal' },
    ],
  },
  {
    id: 'mode.visual',
    summary: 'Enter visual mode',
    handler: ({ engine }) => {
      engine.enterVisual();
      return 'Visual mode';
    },
    patterns: [
      { pattern: 'mode visual', help: 'mode visual' },
      { pattern: 'visual', help: 'visual' },
    ],
  },
  {
    id: 'operator.set',
    summary: 'Set pending operator',
    handler: ({ engine }, { value, count }) => {
      const op = String(value) as OperatorKind;
      if (op === 'delete' || op === 'yank' || op === 'change') {
        engine.setPendingOperator(op, ensureCount(count));
        return `${op}`;
      }
    },
    patterns: [{ pattern: 'operator set {value:oneof[delete|yank|change]} {count:int[1..512]}', help: 'operator set <op> <count>' }],
    hidden: true,
  },
  {
    id: 'operator.clear',
    summary: 'Clear pending operator',
    handler: ({ engine }) => {
      engine.clearPendingOperator();
      engine.clearPrefix();
      return 'Cleared';
    },
    patterns: [{ pattern: 'operator clear', help: 'operator clear' }],
    hidden: true,
  },
  {
    id: 'operator.apply-with-motion',
    summary: 'Apply pending operator using motion',
    handler: ({ engine }, { motionId, count }) => {
      applyPendingOperator(engine, String(motionId) as MotionKind, Number(count ?? 1));
      return 'Applied';
    },
    patterns: [],
    hidden: true,
  },
  {
    id: 'operator.delete.to-end',
    summary: 'Delete to line end respecting axis',
    handler: ({ engine }, { count }) => {
      applyOperator(engine, 'delete', 'line-end', 1, Number(count ?? 1));
      return 'Deleted to end';
    },
    patterns: [{ pattern: 'operator delete-to-end {count:int[1..512]}', help: 'operator delete-to-end <count>' }],
    hidden: true,
  },
  {
    id: 'operator.change.to-end',
    summary: 'Change to line end respecting axis',
    handler: ({ engine }, { count }) => {
      applyOperator(engine, 'change', 'line-end', 1, Number(count ?? 1));
      return 'Changed to end';
    },
    patterns: [{ pattern: 'operator change-to-end {count:int[1..512]}', help: 'operator change-to-end <count>' }],
    hidden: true,
  },
  {
    id: 'edit.repeat-last',
    summary: 'Repeat last modifying action',
    handler: ({ engine }) => {
      engine.repeatLastAction();
      return 'Repeated';
    },
    patterns: [{ pattern: 'repeat last', help: 'repeat last' }],
    hidden: true,
  },
  {
    id: 'prefix.set',
    summary: 'Set pending prefix',
    handler: ({ engine }, { value }) => {
      const val = String(value);
      if (val === 'g' || val === 'r') {
        engine.setPrefix(val as 'g' | 'r');
        return `Prefix ${val}`;
      }
    },
    patterns: [{ pattern: 'prefix set {value:oneof[g|r]}', help: 'prefix set <g|r>' }],
  },
  {
    id: 'prefix.clear',
    summary: 'Clear pending prefix',
    handler: ({ engine }) => {
      engine.clearPrefix();
      return 'Cleared prefix';
    },
    patterns: [{ pattern: 'prefix clear', help: 'prefix clear' }],
  },
];
