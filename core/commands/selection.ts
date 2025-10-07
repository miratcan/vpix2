import type { CommandDefinition } from './common';
import { ensureCount } from './common';

export const selectionCommands: CommandDefinition[] = [
  {
    id: 'selection.exit-visual',
    summary: 'Exit visual mode',
    handler: ({ engine }) => {
      engine.exitVisual();
      engine.clearPrefix();
      return 'Exit visual';
    },
    patterns: [{ pattern: 'visual exit', help: 'visual exit' }],
  },
  {
    id: 'selection.move-left',
    summary: 'Adjust selection to the left',
    handler: ({ engine }, { count }) => {
      const c = ensureCount(count);
      engine.move(-1, 0, c);
      engine.updateSelectionRect();
      return `← ${c}`;
    },
    patterns: [{ pattern: 'selection move-left {count:int[1..512]}', help: 'selection move-left <count>' }],
  },
  {
    id: 'selection.move-right',
    summary: 'Adjust selection to the right',
    handler: ({ engine }, { count }) => {
      const c = ensureCount(count);
      engine.move(1, 0, c);
      engine.updateSelectionRect();
      return `→ ${c}`;
    },
    patterns: [{ pattern: 'selection move-right {count:int[1..512]}', help: 'selection move-right <count>' }],
  },
  {
    id: 'selection.move-up',
    summary: 'Adjust selection upward',
    handler: ({ engine }, { count }) => {
      const c = ensureCount(count);
      engine.move(0, -1, c);
      engine.updateSelectionRect();
      return `↑ ${c}`;
    },
    patterns: [{ pattern: 'selection move-up {count:int[1..512]}', help: 'selection move-up <count>' }],
  },
  {
    id: 'selection.move-down',
    summary: 'Adjust selection downward',
    handler: ({ engine }, { count }) => {
      const c = ensureCount(count);
      engine.move(0, 1, c);
      engine.updateSelectionRect();
      return `↓ ${c}`;
    },
    patterns: [{ pattern: 'selection move-down {count:int[1..512]}', help: 'selection move-down <count>' }],
  },
  {
    id: 'selection.yank',
    summary: 'Yank selection to clipboard',
    handler: ({ engine }) => {
      engine.yankSelection();
      engine.exitVisual();
      engine.clearPrefix();
      return 'Yanked';
    },
    patterns: [{ pattern: 'selection yank', help: 'selection yank' }],
  },
  {
    id: 'selection.delete',
    summary: 'Delete selection',
    handler: ({ engine }) => {
      engine.deleteSelection();
      engine.exitVisual();
      engine.clearPrefix();
      return 'Deleted';
    },
    patterns: [{ pattern: 'selection delete', help: 'selection delete' }],
  },
  {
    id: 'selection.paste',
    summary: 'Paste clipboard at cursor',
    handler: ({ engine }) => {
      engine.pasteAtCursor();
      engine.exitVisual();
      engine.clearPrefix();
      return 'Pasted';
    },
    patterns: [{ pattern: 'selection paste', help: 'selection paste' }],
  },
  {
    id: 'selection.paste-transparent',
    summary: 'Paste clipboard transparently',
    handler: ({ engine }) => {
      engine.pasteAtCursorTransparent();
      engine.exitVisual();
      engine.clearPrefix();
      return 'Pasted transparent';
    },
    patterns: [{ pattern: 'selection paste-transparent', help: 'selection paste-transparent' }],
  },
  {
    id: 'selection.move-to-cursor',
    summary: 'Move selection to cursor',
    handler: ({ engine }) => {
      engine.moveSelectionToCursor();
      engine.exitVisual();
      engine.clearPrefix();
      return 'Moved';
    },
    patterns: [{ pattern: 'selection move-to-cursor', help: 'selection move-to-cursor' }],
  },
  {
    id: 'selection.fill',
    summary: 'Fill selection with current color',
    handler: ({ engine }) => {
      engine.fillSelection();
      engine.exitVisual();
      engine.clearPrefix();
      return 'Filled';
    },
    patterns: [{ pattern: 'selection fill', help: 'selection fill' }],
  },
  {
    id: 'selection.stroke-rect',
    summary: 'Stroke selection rectangle',
    handler: ({ engine }) => {
      engine.strokeRectSelection();
      engine.exitVisual();
      engine.clearPrefix();
      return 'Stroked rect';
    },
    patterns: [{ pattern: 'selection stroke', help: 'selection stroke' }],
  },
  {
    id: 'selection.stroke-circle',
    summary: 'Stroke selection circle',
    handler: ({ engine }) => {
      engine.strokeCircleSelection();
      engine.exitVisual();
      engine.clearPrefix();
      return 'Stroked circle';
    },
    patterns: [{ pattern: 'selection stroke-circle', help: 'selection stroke-circle' }],
  },
  {
    id: 'selection.fill-circle',
    summary: 'Fill selection circle',
    handler: ({ engine }) => {
      engine.fillCircleSelection();
      engine.exitVisual();
      engine.clearPrefix();
      return 'Filled circle';
    },
    patterns: [{ pattern: 'selection fill-circle', help: 'selection fill-circle' }],
  },
  {
    id: 'selection.draw-line',
    summary: 'Draw line between selection anchor and cursor',
    handler: ({ engine }) => {
      const snapshot = engine.selection;
      engine.drawLine(snapshot.anchor, engine.cursor);
      engine.exitVisual();
      engine.clearPrefix();
      return 'Line drawn';
    },
    patterns: [{ pattern: 'selection line', help: 'selection line' }],
  },
  {
    id: 'selection.flood-fill',
    summary: 'Flood fill from cursor',
    handler: ({ engine }) => {
      const sel = engine.selection;
      const hadSelection = Boolean(sel?.active && sel?.rect);
      engine.floodFill(engine.cursor.x, engine.cursor.y);
      if (hadSelection) engine.exitVisual();
      engine.clearPrefix();
      return 'Flood filled';
    },
    patterns: [{ pattern: 'selection flood', help: 'selection flood' }],
  },
];
