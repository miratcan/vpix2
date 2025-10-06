// Key dispatch that routes to commands via the centralized registry

import { runCommand } from './commands';
import type VPixEngine from './engine';
import { MODES } from './engine';
import {
  KEYBINDINGS,
  type BindingCondition,
  type BindingContext,
  type BindingScope,
  type KeyBinding,
} from './keybindings';

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
  count: number,
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

  if (engine.mode === MODES.NORMAL && !prefix && !evt.ctrlKey && !evt.metaKey && /^\d$/.test(evt.key)) {
    engine.pushCountDigit(evt.key);
    return `count:${evt.key}`;
  }

  const count = engine.countValue();
  engine.clearCount();

  const globalBinding = findBinding('global', engine, evt, prefix, count);
  if (globalBinding) {
    return runBinding(globalBinding, engine, evt, prefix, count);
  }

  const scope = scopeForMode(engine.mode);
  const binding = findBinding(scope, engine, evt, prefix, count);
  if (binding) {
    return runBinding(binding, engine, evt, prefix, count);
  }

  return undefined;
}
