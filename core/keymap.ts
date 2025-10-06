// Key dispatch that routes to commands via the centralized registry

import { runCommand } from './commands';
import { MODES } from './engine';
import {
  KEYBINDINGS,
  type BindingCondition,
  type BindingContext,
  type BindingScope,
  type KeyBinding,
} from './keybindings';

import type VPixEngine from './engine';

type EventLike = { key: string; ctrlKey?: boolean; shiftKey?: boolean; metaKey?: boolean };

type BindingLookup = Record<BindingScope, KeyBinding[]>;

const BINDINGS_BY_SCOPE: BindingLookup = buildLookup(KEYBINDINGS);

function buildLookup(bindings: KeyBinding[]): BindingLookup {
  return bindings.reduce(
    (acc, binding) => {
      acc[binding.scope].push(binding);
      return acc;
    },
    { global: [], normal: [], insert: [], visual: [] } as BindingLookup,
  );
}

function conditionMatches(condition: BindingCondition | undefined, prefix: string | null): boolean {
  switch (condition) {
    case undefined:
    case 'always':
      return true;
    case 'no-prefix':
      return !prefix;
    case 'prefix:any':
      return Boolean(prefix);
    case 'prefix:g':
      return prefix === 'g';
    case 'prefix:r':
      return prefix === 'r';
    default:
      return true;
  }
}

function matchKeySpec(spec: string, evt: EventLike): boolean {
  const parts = spec.split('+');
  let requireCtrl = false;
  let requireShift = false;
  let base = spec;
  if (parts.length > 1) {
    base = parts[parts.length - 1];
    for (let i = 0; i < parts.length - 1; i += 1) {
      const mod = parts[i];
      if (mod === 'ctrl') requireCtrl = true;
      if (mod === 'shift') requireShift = true;
    }
  }
  if (requireCtrl !== Boolean(evt.ctrlKey)) return false;
  if (requireShift !== Boolean(evt.shiftKey)) return false;

  const key = requireCtrl && evt.key.length === 1 ? evt.key.toLowerCase() : evt.key;
  if (/^\[[^\]]+\]$/.test(base)) {
    const expr = base.slice(1, -1);
    const regex = new RegExp(`^[${expr}]$`);
    return regex.test(requireCtrl ? key : evt.key);
  }
  if (base === 'Space') return evt.key === ' ';
  if (requireCtrl) return key === base.toLowerCase();
  return evt.key === base;
}

function findBinding(
  scope: BindingScope,
  engine: VPixEngine,
  evt: EventLike,
  prefix: string | null,
  _count: number,
): KeyBinding | undefined {
  const candidates = BINDINGS_BY_SCOPE[scope];
  for (const binding of candidates) {
    if (!conditionMatches(binding.when, prefix)) continue;
    if (!matchKeySpec(binding.key, evt)) continue;
    return binding;
  }
  return undefined;
}

function runBinding(
  binding: KeyBinding,
  engine: VPixEngine,
  evt: EventLike,
  prefix: string | null,
  count: number,
) {
  const ctx: BindingContext = { engine, event: evt, prefix, count };
  const args = binding.args ? binding.args(ctx) ?? {} : {};
  const result = runCommand(engine, binding.command, args);
  if (result && typeof (result as any).then === 'function') {
    (result as Promise<unknown>).catch(() => {});
  }
  return binding.command;
}

function scopeForMode(mode: number): BindingScope {
  if (mode === MODES.NORMAL) return 'normal';
  if (mode === MODES.INSERT) return 'insert';
  return 'visual';
}

export function dispatchKey(engine: VPixEngine, evt: EventLike) {
  const prefix = engine.prefix ?? null;
  const pendingOperator = engine.pendingOperator;

  if (pendingOperator && evt.key === 'Escape') {
    engine.clearPendingOperator();
    engine.clearPrefix();
    return 'operator.cancel';
  }

  const isDigit = /^\d$/.test(evt.key);
  const isLeadingZero = evt.key === '0' && !engine.hasCount();
  if (engine.mode === MODES.NORMAL && !prefix && !evt.ctrlKey && !evt.metaKey && isDigit && !isLeadingZero) {
    engine.pushCountDigit(evt.key);
    return `count:${evt.key}`;
  }

  const count = engine.countValue();
  let shouldClearCount = true;

  const globalBinding = findBinding('global', engine, evt, prefix, count);
  if (globalBinding) {
    if (globalBinding.command === 'prefix.set') shouldClearCount = false;
    const result = runBinding(globalBinding, engine, evt, prefix, count);
    if (shouldClearCount) engine.clearCount();
    return result;
  }

  const scope = scopeForMode(engine.mode);
  const binding = findBinding(scope, engine, evt, prefix, count);
  if (binding) {
    if (binding.command === 'prefix.set') shouldClearCount = false;
    if (pendingOperator && binding.command.startsWith('motion.')) {
      const ctx: BindingContext = { engine, event: evt, prefix, count };
      const args = binding.args ? binding.args(ctx) ?? {} : {};
      const motionCount = typeof (args as any).count === 'number' ? Number((args as any).count) : count;
      const result = runCommand(engine, 'operator.apply-with-motion', {
        motionId: binding.command,
        count: motionCount,
      });
      if (result && typeof (result as any).then === 'function') {
        (result as Promise<unknown>).catch(() => {});
      }
      if (shouldClearCount) engine.clearCount();
      return binding.command;
    }
    const output = runBinding(binding, engine, evt, prefix, count);
    if (shouldClearCount) engine.clearCount();
    return output;
  }

  if (shouldClearCount) engine.clearCount();
  return undefined;
}
