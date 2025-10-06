// Centralized command catalog and executor for VPix

import { createRegistry, type CommandExecutionResult, type CommandMeta } from './command-registry';
import VPixEngine, { MODES, type MotionKind, type OperatorKind } from './engine';
import { KEYBINDINGS } from './keybindings';
import { DocumentRepository } from './services/document-repository';
import { PaletteService } from './services/palette-service';
import { ShareLinkService } from './services/share-link-service';

export type CommandServices = {
  documents?: DocumentRepository | null;
  palettes?: PaletteService | null;
  shareLinks?: ShareLinkService | null;
  fetch?: typeof fetch;
};

export type RuntimeServices = {
  documents?: DocumentRepository | null;
  palettes: PaletteService;
  shareLinks: ShareLinkService;
  fetch?: typeof fetch;
};

const STORAGE_KEY = 'vpix.document.v1';
const defaultPalettes = new PaletteService();
const defaultShareLinks = new ShareLinkService();
const defaultDocuments = new DocumentRepository(STORAGE_KEY);

function resolveServices(services?: CommandServices): RuntimeServices {
  return {
    documents: services?.documents ?? defaultDocuments,
    palettes: services?.palettes ?? defaultPalettes,
    shareLinks: services?.shareLinks ?? defaultShareLinks,
    fetch: services?.fetch ?? (typeof fetch === 'function' ? fetch : undefined),
  };
}

export type CommandResult = { ok: boolean; msg: string; meta?: CommandMeta };

type CommandContext = { engine: VPixEngine; services: RuntimeServices };

type CommandHandlerReturn =
  | void
  | string
  | CommandResult
  | { ok?: boolean; msg?: string; meta?: CommandMeta; silent?: boolean; closeTerminal?: boolean; lines?: string[] };

type CommandHandler = (
  ctx: CommandContext,
  args: Record<string, unknown>,
) => CommandHandlerReturn | Promise<CommandHandlerReturn>;

type CommandPattern = {
  pattern: string;
  help?: string;
  mapArgs?: (args: Record<string, unknown>) => Record<string, unknown>;
};

type CommandDefinition = {
  id: string;
  summary: string;
  handler: CommandHandler;
  patterns: CommandPattern[];
  hidden?: boolean;
};

const ensureCount = (value: unknown) => {
  const n = Number(value ?? 1);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.max(1, Math.floor(n));
};

const runMotion = (engine: VPixEngine, motion: MotionKind, count: number) => {
  engine.applyMotion(motion, ensureCount(count));
  engine.clearPrefix();
};

const applyOperator = (
  engine: VPixEngine,
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
      const repeatCursor = axis === 'horizontal' ? { x: repeatSegment.start, y: currentFixed } : { x: currentFixed, y: repeatSegment.start };
      eng.cursor.x = repeatCursor.x;
      eng.cursor.y = repeatCursor.y;
      const changedAgain = eng.deleteSegment(repeatSegment);
      if (op === 'change') {
        eng.setMode(MODES.INSERT);
      } else if (!changedAgain) {
        eng.emit();
      }
    });
  };

  const changed = applyDelete();
  if (op === 'change') {
    engine.setMode(MODES.INSERT);
  }

  if (changed) {
    recordRepeat();
  } else {
    engine.recordLastAction(null);
    if (op !== 'change') {
      engine.emit();
    }
  }
};

const applyPendingOperator = (engine: VPixEngine, motion: MotionKind | string, motionCount: number) => {
  const pending = engine.pendingOperator;
  if (!pending) return;
  engine.clearPendingOperator();
  const motionId = String(motion);
  const normalized = (motionId.startsWith('motion.')
    ? (motionId.slice('motion.'.length) as MotionKind)
    : (motionId as MotionKind));
  applyOperator(engine, pending.op, normalized, pending.count, motionCount);
};

const COMMAND_DEFINITIONS: CommandDefinition[] = [
  {
    id: 'axis.toggle',
    summary: 'Toggle movement axis (horizontal/vertical)',
    handler: ({ engine }) => {
      engine.toggleAxis();
    },
    patterns: [
      { pattern: 'axis toggle', help: 'axis toggle' },
    ],
  },
  {
    id: 'axis.set',
    summary: 'Set movement axis explicitly',
    handler: ({ engine }, { value }) => {
      const v = String(value);
      if (v === 'horizontal' || v === 'vertical') engine.setAxis(v as any);
    },
    patterns: [
      { pattern: 'axis set {value:oneof[horizontal|vertical]}', help: 'axis set <horizontal|vertical>' },
    ],
    hidden: false,
  },
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
      const pal = await services.palettes.fetchPalette(String(slug));
      return pal ? `loaded: ${pal.slug} (${pal.colors.length})` : `failed to load: ${String(slug)}`;
    },
    patterns: [{ pattern: 'palette fetch {slug:slug}', help: 'palette fetch <slug>' }],
  },
  {
    id: 'palette.search',
    summary: 'Search palettes on LoSpec',
    handler: async ({ services }, { term }) => {
      const results = await services.palettes.searchRemote(String(term));
      return results.length ? results.join(', ') : 'no results';
    },
    patterns: [{ pattern: 'palette search {term:rest}', help: 'palette search <term>' }],
  },
  {
    id: 'document.read',
    summary: 'Load last saved document',
    handler: ({ engine, services }) => {
      if (!services.documents) return 'storage not available';
      const doc = services.documents.load();
      if (!doc) return 'No saved document';
      engine.loadSnapshot(doc);
      return 'document loaded';
    },
    patterns: [{ pattern: 'read', help: 'read' }],
  },
  {
    id: 'document.read-json',
    summary: 'Load document from JSON',
    handler: ({ engine }, { doc }) => {
      try {
        const raw = typeof doc === 'string' ? doc : JSON.stringify(doc);
        const loaded = VPixEngine.deserialize(raw);
        engine.loadSnapshot(loaded.toSnapshot());
        return 'document loaded';
      } catch {
        return 'invalid json';
      }
    },
    patterns: [{ pattern: 'read json {doc:json}', help: 'read json <{...}>' }],
  },
  {
    id: 'document.read-url',
    summary: 'Fetch and load document from URL',
    handler: async ({ engine, services }, { url }) => {
      const fetchImpl = services.fetch;
      if (!fetchImpl) return 'network unavailable';
      try {
        const txt = await fetchImpl(String(url)).then((r) => r.text());
        const loaded = VPixEngine.deserialize(txt);
        engine.loadSnapshot(loaded.toSnapshot());
        return 'document loaded';
      } catch {
        return 'network error';
      }
    },
    patterns: [{ pattern: 'read url {url:url}', help: 'read url <https://...>' }],
  },
  {
    id: 'share.link',
    summary: 'Store shareable link in history',
    handler: ({ engine, services }) => {
      const res = services.shareLinks.updateHistory(engine);
      return res.msg;
    },
    patterns: [{ pattern: 'link', help: 'link' }],
  },
  {
    id: 'share.copylink',
    summary: 'Copy shareable link to clipboard',
    handler: async ({ engine, services }) => {
      const res = await services.shareLinks.copyLink(engine);
      return res.msg;
    },
    patterns: [{ pattern: 'copylink', help: 'copylink' }],
  },
  {
    id: 'history.undo',
    summary: 'Undo last action',
    handler: ({ engine }) => {
      engine.undo();
    },
    patterns: [{ pattern: 'undo', help: 'undo' }],
  },
  {
    id: 'history.redo',
    summary: 'Redo last undone action',
    handler: ({ engine }) => {
      engine.redo();
    },
    patterns: [{ pattern: 'redo', help: 'redo' }],
  },
  {
    id: 'palette.swap-last-color',
    summary: 'Swap with previously used palette color',
    handler: ({ engine }) => {
      engine.swapToLastColor();
    },
    patterns: [{ pattern: 'palette swap-last', help: 'palette swap-last' }],
  },
  {
    id: 'cursor.move-left',
    summary: 'Move cursor left',
    handler: ({ engine }, { count }) => {
      const steps = Math.max(1, Number(count ?? 1));
      engine.move(-1, 0, steps);
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
      const steps = Math.max(1, Number(count ?? 1));
      engine.move(1, 0, steps);
    },
    patterns: [
      { pattern: 'move right', help: 'move right', mapArgs: () => ({ count: 1 }) },
      { pattern: 'move right {count:int[1..512]}', help: 'move right <count>' },
    ],
  },
  {
    id: 'motion.word-next',
    summary: 'Move to next run start along axis',
    handler: ({ engine }, { count }) => {
      runMotion(engine, 'word-next', Number(count ?? 1));
    },
    patterns: [{ pattern: 'motion word-next {count:int[1..512]}', help: 'motion word-next <count>' }],
    hidden: true,
  },
  {
    id: 'motion.word-prev',
    summary: 'Move to previous run start along axis',
    handler: ({ engine }, { count }) => {
      runMotion(engine, 'word-prev', Number(count ?? 1));
    },
    patterns: [{ pattern: 'motion word-prev {count:int[1..512]}', help: 'motion word-prev <count>' }],
    hidden: true,
  },
  {
    id: 'motion.word-end-next',
    summary: 'Move to end of current/next run along axis',
    handler: ({ engine }, { count }) => {
      runMotion(engine, 'word-end-next', Number(count ?? 1));
    },
    patterns: [{ pattern: 'motion word-end-next {count:int[1..512]}', help: 'motion word-end-next <count>' }],
    hidden: true,
  },
  {
    id: 'motion.word-end-prev',
    summary: 'Move to end of previous run along axis',
    handler: ({ engine }, { count }) => {
      runMotion(engine, 'word-end-prev', Number(count ?? 1));
    },
    patterns: [{ pattern: 'motion word-end-prev {count:int[1..512]}', help: 'motion word-end-prev <count>' }],
    hidden: true,
  },
  {
    id: 'motion.line-begin',
    summary: 'Move to beginning of line/column along axis',
    handler: ({ engine }) => {
      runMotion(engine, 'line-begin', 1);
    },
    patterns: [{ pattern: 'motion line-begin', help: 'motion line-begin' }],
    hidden: true,
  },
  {
    id: 'motion.line-first-nonblank',
    summary: 'Move to first filled cell along axis',
    handler: ({ engine }) => {
      runMotion(engine, 'line-first-nonblank', 1);
    },
    patterns: [{ pattern: 'motion line-first-nonblank', help: 'motion line-first-nonblank' }],
    hidden: true,
  },
  {
    id: 'motion.line-end',
    summary: 'Move to end of line/column along axis',
    handler: ({ engine }) => {
      runMotion(engine, 'line-end', 1);
    },
    patterns: [{ pattern: 'motion line-end', help: 'motion line-end' }],
    hidden: true,
  },
  {
    id: 'motion.canvas-begin',
    summary: 'Move to canvas beginning respecting axis',
    handler: ({ engine }) => {
      runMotion(engine, 'canvas-begin', 1);
    },
    patterns: [{ pattern: 'motion canvas-begin', help: 'motion canvas-begin' }],
    hidden: true,
  },
  {
    id: 'motion.canvas-end',
    summary: 'Move to canvas end respecting axis',
    handler: ({ engine }) => {
      runMotion(engine, 'canvas-end', 1);
    },
    patterns: [{ pattern: 'motion canvas-end', help: 'motion canvas-end' }],
    hidden: true,
  },
  {
    id: 'cursor.move-up',
    summary: 'Move cursor up',
    handler: ({ engine }, { count }) => {
      const steps = Math.max(1, Number(count ?? 1));
      engine.move(0, -1, steps);
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
      const steps = Math.max(1, Number(count ?? 1));
      engine.move(0, 1, steps);
    },
    patterns: [
      { pattern: 'move down', help: 'move down', mapArgs: () => ({ count: 1 }) },
      { pattern: 'move down {count:int[1..512]}', help: 'move down <count>' },
    ],
  },
  {
    id: 'mode.insert',
    summary: 'Switch to insert mode',
    handler: ({ engine }) => {
      engine.setMode(MODES.INSERT);
      engine.clearPrefix();
    },
    patterns: [
      { pattern: 'mode insert', help: 'mode insert' },
      { pattern: 'insert', help: 'insert' },
    ],
  },
  {
    id: 'mode.normal',
    summary: 'Switch to normal mode',
    handler: ({ engine }) => {
      engine.setMode(MODES.NORMAL);
      engine.clearPrefix();
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
    },
    patterns: [{ pattern: 'operator clear', help: 'operator clear' }],
    hidden: true,
  },
  {
    id: 'operator.apply-with-motion',
    summary: 'Apply pending operator using motion',
    handler: ({ engine }, { motionId, count }) => {
      applyPendingOperator(engine, String(motionId) as MotionKind, Number(count ?? 1));
    },
    patterns: [],
    hidden: true,
  },
  {
    id: 'operator.delete.to-end',
    summary: 'Delete to line end respecting axis',
    handler: ({ engine }, { count }) => {
      applyOperator(engine, 'delete', 'line-end', 1, Number(count ?? 1));
    },
    patterns: [{ pattern: 'operator delete-to-end {count:int[1..512]}', help: 'operator delete-to-end <count>' }],
    hidden: true,
  },
  {
    id: 'operator.change.to-end',
    summary: 'Change to line end respecting axis',
    handler: ({ engine }, { count }) => {
      applyOperator(engine, 'change', 'line-end', 1, Number(count ?? 1));
    },
    patterns: [{ pattern: 'operator change-to-end {count:int[1..512]}', help: 'operator change-to-end <count>' }],
    hidden: true,
  },
  {
    id: 'edit.repeat-last',
    summary: 'Repeat last modifying action',
    handler: ({ engine }) => {
      engine.repeatLastAction();
    },
    patterns: [{ pattern: 'repeat last', help: 'repeat last' }],
    hidden: true,
  },
  {
    id: 'paint.erase',
    summary: 'Erase cells',
    handler: ({ engine }, { count }) => {
      const times = Math.max(1, Number(count ?? 1));
      for (let i = 0; i < times; i += 1) engine.erase();
      engine.recordLastAction((eng) => {
        for (let i = 0; i < times; i += 1) eng.erase();
      });
    },
    patterns: [
      { pattern: 'erase', help: 'erase', mapArgs: () => ({ count: 1 }) },
      { pattern: 'erase {count:int[1..512]}', help: 'erase <count>' },
    ],
  },
  {
    id: 'paint.cut',
    summary: 'Cut cells (delete and yank to clipboard)',
    handler: ({ engine }, { count }) => {
      const times = Math.max(1, Number(count ?? 1));
      for (let i = 0; i < times; i += 1) engine.cut();
      engine.recordLastAction((eng) => {
        for (let i = 0; i < times; i += 1) eng.cut();
      });
    },
    patterns: [
      { pattern: 'cut', help: 'cut', mapArgs: () => ({ count: 1 }) },
      { pattern: 'cut {count:int[1..512]}', help: 'cut <count>' },
    ],
  },
  {
    id: 'paint.toggle',
    summary: 'Toggle cells',
    handler: ({ engine }, { count }) => {
      const times = Math.max(1, Number(count ?? 1));
      for (let i = 0; i < times; i += 1) engine.toggle();
      engine.recordLastAction((eng) => {
        for (let i = 0; i < times; i += 1) eng.toggle();
      });
    },
    patterns: [
      { pattern: 'toggle', help: 'toggle', mapArgs: () => ({ count: 1 }) },
      { pattern: 'toggle {count:int[1..512]}', help: 'toggle <count>' },
    ],
  },
  {
    id: 'paint.apply',
    summary: 'Paint current cell',
    handler: ({ engine }) => {
      const colorIndex = engine.currentColorIndex;
      engine.paint(colorIndex);
      engine.recordLastAction((eng) => {
        eng.paint(colorIndex);
      });
    },
    patterns: [{ pattern: 'paint', help: 'paint' }],
  },
  {
    id: 'palette.select-index',
    summary: 'Select palette color by index',
    handler: ({ engine }, { index }) => {
      const paletteLength = engine.palette.length;
      if (!paletteLength) return;
      const idx = Math.min(paletteLength, Math.max(1, Number(index ?? 1)));
      engine.setColorIndex(idx - 1);
      engine.clearPrefix();
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
    },
    patterns: [{ pattern: 'paint color {index:int[1..512]}', help: 'paint color <index>' }],
  },
  {
    id: 'palette.cycle-next',
    summary: 'Select next palette color',
    handler: ({ engine }) => {
      if (!engine.palette.length) return;
      const next = (engine.currentColorIndex + 1) % engine.palette.length;
      engine.setColorIndex(next);
      engine.clearPrefix();
    },
    patterns: [{ pattern: 'palette next', help: 'palette next' }],
  },
  {
    id: 'palette.cycle-previous',
    summary: 'Select previous palette color',
    handler: ({ engine }) => {
      if (!engine.palette.length) return;
      const prev = (engine.currentColorIndex - 1 + engine.palette.length) % engine.palette.length;
      engine.setColorIndex(prev);
      engine.clearPrefix();
    },
    patterns: [{ pattern: 'palette prev', help: 'palette prev' }],
  },
  {
    id: 'selection.exit-visual',
    summary: 'Exit visual mode',
    handler: ({ engine }) => {
      engine.exitVisual();
      engine.clearPrefix();
    },
    patterns: [{ pattern: 'visual exit', help: 'visual exit' }],
  },
  {
    id: 'selection.move-left',
    summary: 'Adjust selection to the left',
    handler: ({ engine }, { count }) => {
      const steps = Math.max(1, Number(count ?? 1));
      engine.move(-1, 0, steps);
      engine.updateSelectionRect();
    },
    patterns: [{ pattern: 'selection move-left {count:int[1..512]}', help: 'selection move-left <count>' }],
  },
  {
    id: 'selection.move-right',
    summary: 'Adjust selection to the right',
    handler: ({ engine }, { count }) => {
      const steps = Math.max(1, Number(count ?? 1));
      engine.move(1, 0, steps);
      engine.updateSelectionRect();
    },
    patterns: [{ pattern: 'selection move-right {count:int[1..512]}', help: 'selection move-right <count>' }],
  },
  {
    id: 'selection.move-up',
    summary: 'Adjust selection upward',
    handler: ({ engine }, { count }) => {
      const steps = Math.max(1, Number(count ?? 1));
      engine.move(0, -1, steps);
      engine.updateSelectionRect();
    },
    patterns: [{ pattern: 'selection move-up {count:int[1..512]}', help: 'selection move-up <count>' }],
  },
  {
    id: 'selection.move-down',
    summary: 'Adjust selection downward',
    handler: ({ engine }, { count }) => {
      const steps = Math.max(1, Number(count ?? 1));
      engine.move(0, 1, steps);
      engine.updateSelectionRect();
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
    },
    patterns: [{ pattern: 'selection paste-transparent', help: 'selection paste-transparent' }],
  },
  {
    id: 'clipboard.paste',
    summary: 'Paste clipboard at cursor (normal mode)',
    handler: ({ engine }) => {
      engine.pasteAtCursor();
      engine.recordLastAction((eng) => {
        eng.pasteAtCursor();
      });
      engine.clearPrefix();
    },
    patterns: [{ pattern: 'paste', help: 'paste' }],
  },
  {
    id: 'clipboard.paste-transparent',
    summary: 'Paste clipboard transparently (normal mode)',
    handler: ({ engine }) => {
      engine.pasteAtCursorTransparent();
      engine.recordLastAction((eng) => {
        eng.pasteAtCursorTransparent();
      });
      engine.clearPrefix();
    },
    patterns: [{ pattern: 'paste transparent', help: 'paste transparent' }],
  },
  {
    id: 'selection.rotate-cw',
    summary: 'Rotate clipboard clockwise',
    handler: ({ engine }) => {
      engine.rotateClipboardCW();
    },
    patterns: [{ pattern: 'selection rotate-cw', help: 'selection rotate-cw' }],
  },
  {
    id: 'selection.rotate-ccw',
    summary: 'Rotate clipboard counterclockwise',
    handler: ({ engine }) => {
      engine.rotateClipboardCCW();
    },
    patterns: [{ pattern: 'selection rotate-ccw', help: 'selection rotate-ccw' }],
  },
  {
    id: 'selection.move-to-cursor',
    summary: 'Move selection to cursor',
    handler: ({ engine }) => {
      engine.moveSelectionToCursor();
      engine.exitVisual();
      engine.clearPrefix();
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
    },
    patterns: [{ pattern: 'selection stroke', help: 'selection stroke' }],
  },
  {
    id: 'selection.draw-line',
    summary: 'Draw line between selection anchor and cursor',
    handler: ({ engine }) => {
      const snapshot = engine.selection;
      engine.drawLine(snapshot.anchor, engine.cursor);
      engine.exitVisual();
      engine.clearPrefix();
    },
    patterns: [{ pattern: 'selection line', help: 'selection line' }],
  },
  {
    id: 'selection.flood-fill',
    summary: 'Flood fill selection area',
    handler: ({ engine }) => {
      engine.floodFill(engine.cursor.x, engine.cursor.y);
      engine.exitVisual();
      engine.clearPrefix();
    },
    patterns: [{ pattern: 'selection flood', help: 'selection flood' }],
  },
  {
    id: 'prefix.set',
    summary: 'Set pending prefix',
    handler: ({ engine }, { value }) => {
      const val = String(value);
      if (val === 'g' || val === 'r') engine.setPrefix(val as 'g' | 'r');
    },
    patterns: [{ pattern: 'prefix set {value:oneof[g|r]}', help: 'prefix set <g|r>' }],
  },
  {
    id: 'prefix.clear',
    summary: 'Clear pending prefix',
    handler: ({ engine }) => {
      engine.clearPrefix();
    },
    patterns: [{ pattern: 'prefix clear', help: 'prefix clear' }],
  },
  {
    id: 'core.help',
    summary: 'Show available commands',
    handler: (_ctx, { prefix }) => {
      const list = describeCommands(prefix ? String(prefix) : undefined);
      if (!list.length) return { msg: 'no commands', meta: { lines: ['no commands'] } };
      const lines = formatHelpLines(list);
      return { msg: lines.join('\n'), meta: { lines } };
    },
    patterns: [
      { pattern: 'help', help: 'help' },
      { pattern: 'help {prefix:rest}', help: 'help <prefix>' },
    ],
  },
];

const _registry = createRegistry();
let _registryInit = false;
const _definitions = new Map<string, CommandDefinition>();

function ensureRegistry() {
  if (_registryInit) return;
  _registryInit = true;
  for (const def of COMMAND_DEFINITIONS) {
    _definitions.set(def.id, def);
    for (const pattern of def.patterns) {
      (_registry as any).registerS(
        pattern.pattern,
        (ctx: any, rawArgs: Record<string, unknown>) => {
          const mapped = pattern.mapArgs ? pattern.mapArgs(rawArgs ?? {}) : rawArgs ?? {};
          return def.handler({ engine: ctx.engine as VPixEngine, services: ctx.services as RuntimeServices }, mapped);
        },
        { help: pattern.help ?? pattern.pattern },
      );
    }
  }
}

function buildMeta(source: any): CommandMeta | undefined {
  if (!source || typeof source !== 'object') return undefined;
  const meta: CommandMeta = {};
  if (source.meta && typeof source.meta === 'object') Object.assign(meta, source.meta);
  if ('silent' in source && source.silent != null) meta.silent = Boolean(source.silent);
  if ('closeTerminal' in source && source.closeTerminal != null) meta.closeTerminal = Boolean(source.closeTerminal);
  if ('lines' in source && source.lines != null) {
    const lines = Array.isArray(source.lines) ? source.lines.map((ln: unknown) => String(ln)) : [String(source.lines)];
    meta.lines = lines;
  }
  return Object.keys(meta).length ? meta : undefined;
}

function normalizeCommandResult(ret: any): CommandResult {
  if (ret == null) return { ok: true, msg: '' };
  if (typeof ret === 'string') return { ok: true, msg: ret };
  if (typeof ret === 'object') {
    const ok = 'ok' in ret ? Boolean(ret.ok) : true;
    const msg = 'msg' in ret ? String(ret.msg ?? '') : '';
    const meta = buildMeta(ret);
    return { ok, msg, meta };
  }
  return { ok: true, msg: String(ret) };
}

export function executeCommand(
  engine: VPixEngine,
  input: string,
  services?: CommandServices,
): CommandResult | Promise<CommandResult> {
  const cmd = (input || '').trim();
  if (!cmd) return { ok: false, msg: 'Empty command' };
  ensureRegistry();
  const runtime = resolveServices(services);
  const out = (_registry as any).execute(cmd, { engine, services: runtime }) as
    | CommandExecutionResult
    | Promise<CommandExecutionResult>;
  if (out && typeof (out as any).then === 'function') {
    return (out as Promise<CommandExecutionResult>).then(({ matched, ok, msg, meta }) =>
      matched ? { ok, msg, meta } : { ok: false, msg: `Unknown command: ${cmd}` },
    );
  }
  const { matched, ok, msg, meta } = out as CommandExecutionResult;
  return matched ? { ok, msg, meta } : { ok: false, msg: `Unknown command: ${cmd}` };
}

export function runCommand(
  engine: VPixEngine,
  id: string,
  args?: Record<string, unknown>,
  services?: CommandServices,
): CommandResult | Promise<CommandResult> {
  ensureRegistry();
  const def = _definitions.get(id);
  if (!def) return { ok: false, msg: `Unknown command: ${id}` };
  const runtime = resolveServices(services);
  try {
    const result = def.handler({ engine, services: runtime }, args ?? {});
    if (result && typeof (result as any).then === 'function') {
      return (result as Promise<any>)
        .then((value) => normalizeCommandResult(value))
        .catch(() => ({ ok: false, msg: 'command failed' }));
    }
    return normalizeCommandResult(result);
  } catch {
    return { ok: false, msg: 'command failed' };
  }
}

export function suggestCommands(input: string): string[] {
  ensureRegistry();
  return (_registry as any).suggest(input) as string[];
}

type CommandSummary = { id: string; name: string; summary: string; keys: string[] };

function formatBindingKey(scope: string, key: string, condition?: string): string {
  const extras: string[] = [];
  if (condition === 'prefix:any') extras.push('prefix');
  if (condition === 'prefix:g') extras.push('prefix g');
  if (condition === 'prefix:r') extras.push('prefix r');
  const suffix = extras.length ? ` [${extras.join(', ')}]` : '';
  return `${scope}:${key}${suffix}`;
}

function collectCommandKeys(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const binding of KEYBINDINGS) {
    const label = formatBindingKey(binding.scope, binding.display ?? binding.key, binding.when);
    const bucket = map.get(binding.command) ?? [];
    if (!bucket.includes(label)) bucket.push(label);
    map.set(binding.command, bucket);
  }
  return map;
}

function formatHelpLines(entries: CommandSummary[]): string[] {
  return entries.map((entry) => {
    const keyText = entry.keys.length ? ` [keys: ${entry.keys.join(', ')}]` : '';
    return `${entry.name} — ${entry.summary}${keyText}`;
  });
}

export function describeCommands(prefix?: string): CommandSummary[] {
  ensureRegistry();
  const keyMap = collectCommandKeys();
  const normPrefix = prefix?.toLowerCase();
  return COMMAND_DEFINITIONS
    .filter((def) => !def.hidden)
    .map((def) => {
      const primaryPattern = def.patterns[0];
      const name = primaryPattern?.help ?? primaryPattern?.pattern ?? def.id;
      return {
        id: def.id,
        name,
        summary: def.summary,
        keys: keyMap.get(def.id) ?? [],
      } satisfies CommandSummary;
    })
    .filter((entry) => {
      if (!normPrefix) return true;
      const idMatch = entry.id.toLowerCase().startsWith(normPrefix);
      const nameMatch = entry.name.toLowerCase().startsWith(normPrefix);
      return idMatch || nameMatch;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function helpCommands(prefix?: string): string[] {
  const entries = describeCommands(prefix);
  if (!entries.length) return [];
  return formatHelpLines(entries);
}
