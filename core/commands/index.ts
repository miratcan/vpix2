import type VPixEngine from '../engine';

import {
  CommandExecutionResult,
  type CommandDefinition,
  type CommandResult,
  type CommandServices,
  type RuntimeServices,
  KEYBINDINGS,
  createCommandRegistry,
  normalizeCommandResult,
  resolveServices,
} from './common';
import { axisCommands } from './axis';
import { canvasCommands } from './canvas';
import { clipboardCommands } from './clipboard';
import { documentCommands } from './document';
import { historyCommands } from './history';
import { modeCommands } from './mode';
import { paintCommands } from './paint';
import { paletteCommands } from './palette';
import { selectionCommands } from './selection';
import { shareCommands } from './share';
import { viewCommands } from './view';

const FEATURE_COMMANDS: CommandDefinition[] = [
  ...axisCommands,
  ...canvasCommands,
  ...clipboardCommands,
  ...documentCommands,
  ...historyCommands,
  ...modeCommands,
  ...paintCommands,
  ...paletteCommands,
  ...selectionCommands,
  ...shareCommands,
  ...viewCommands,
];

const COMMAND_DEFINITIONS: CommandDefinition[] = [...FEATURE_COMMANDS];

const registry = createCommandRegistry();
let registryInitialized = false;
const definitionMap = new Map<string, CommandDefinition>();

function formatBindingKey(scope: string, key: string, condition?: string) {
  const extras: string[] = [];
  if (condition === 'prefix:any') extras.push('prefix');
  if (condition === 'prefix:g') extras.push('prefix g');
  if (condition === 'prefix:r') extras.push('prefix r');
  const suffix = extras.length ? ` [${extras.join(', ')}]` : '';
  return `${scope}:${key}${suffix}`;
}

function collectCommandKeys() {
  const map = new Map<string, string[]>();
  for (const binding of KEYBINDINGS) {
    const label = formatBindingKey(binding.scope, binding.display ?? binding.key, binding.when);
    const bucket = map.get(binding.command) ?? [];
    if (!bucket.includes(label)) bucket.push(label);
    map.set(binding.command, bucket);
  }
  return map;
}

type CommandSummary = { id: string; name: string; summary: string; keys: string[] };

function formatHelpLines(entries: CommandSummary[]) {
  return entries.map((entry) => {
    const keyText = entry.keys.length ? ` [keys: ${entry.keys.join(', ')}]` : '';
    return `${entry.name} — ${entry.summary}${keyText}`;
  });
}

export function describeCommands(prefix?: string): CommandSummary[] {
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

COMMAND_DEFINITIONS.push({
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
});

function ensureRegistry() {
  if (registryInitialized) return;
  registryInitialized = true;
  for (const def of COMMAND_DEFINITIONS) {
    definitionMap.set(def.id, def);
    for (const pattern of def.patterns) {
      registry.registerS(
        pattern.pattern,
        (ctx: any, rawArgs: Record<string, unknown>) => {
          const mapped = pattern.mapArgs ? pattern.mapArgs(rawArgs ?? {}) : rawArgs ?? {};
          return def.handler({ engine: ctx.engine as VPixEngine, services: ctx.services as RuntimeServices }, mapped);
        },
        { help: pattern.help ?? pattern.pattern, managesHistory: def.managesHistory },
      );
    }
  }
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

  const processAndEmit = (result: CommandExecutionResult) => {
    const { matched, ok, msg, meta } = result;
    const finalResult = matched ? { ok, msg, meta } : { ok: false, msg: `Unknown command: ${cmd}` };
    try {
      if (finalResult.msg || finalResult.meta?.lines) {
        (engine as any).emit({ cmd: { display: finalResult.msg, lines: finalResult.meta?.lines, ok: finalResult.ok } });
      }
    } catch {}
    return finalResult;
  };

  const out = registry.execute(cmd, { engine, services: runtime });

  if (out && typeof (out as any).then === 'function') {
    return (out as Promise<CommandExecutionResult>).then(processAndEmit);
  }

  return processAndEmit(out as CommandExecutionResult);
}

export function runCommand(
  engine: VPixEngine,
  id: string,
  args?: Record<string, unknown>,
  services?: CommandServices,
): CommandResult | Promise<CommandResult> {
  ensureRegistry();
  const def = definitionMap.get(id);
  if (!def) return { ok: false, msg: `Unknown command: ${id}` };
  const runtime = resolveServices(services);
  const managesHistory = def.managesHistory !== undefined ? def.managesHistory : true;
  const autoGroup = !managesHistory;
  const historyLabel = def.patterns[0]?.help ?? def.patterns[0]?.pattern ?? def.id;
  try {
    if (autoGroup) {
      try {
        engine.beginGroup(historyLabel);
      } catch {}
    }
    const result = def.handler({ engine, services: runtime }, args ?? {});
    if (result && typeof (result as any).then === 'function') {
      return (result as Promise<any>)
        .then((value) => {
          if (autoGroup) {
            try {
              engine.endGroup();
            } catch {}
          }
          const normalized = normalizeCommandResult(value);
          try {
            // Only emit if we have a message
            if (normalized.msg) {
              (engine as any).emit({ cmd: { id, display: normalized.msg, ok: normalized.ok } });
            }
          } catch {}
          return normalized;
        })
        .catch(() => ({ ok: false, msg: 'command failed' }));
    }
    const out = normalizeCommandResult(result);
    if (autoGroup) {
      try {
        engine.endGroup();
      } catch {}
    }
    try {
      // Only emit if we have a message (skip empty void returns)
      if (out.msg) {
        (engine as any).emit({ cmd: { id, display: out.msg, ok: out.ok } });
      }
    } catch {}
    return out;
  } catch {
    return { ok: false, msg: 'command failed' };
  }
}

export function suggestCommands(input: string): string[] {
  ensureRegistry();
  return registry.suggest(input) as string[];
}

export type { CommandServices, RuntimeServices, CommandResult };
export { COMMAND_DEFINITIONS };
