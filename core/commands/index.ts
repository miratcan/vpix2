import type VPixEngine from '../engine';

import {
  CommandExecutionResult,
  type CommandDefinition,
  type CommandResult,
  type CommandServices,
  type RuntimeServices,
  createCommandRegistry,
  normalizeCommandResult,
  resolveServices,
} from './common';
import { axisCommands } from './axis';
import { gridCommands } from './grid';
import { clipboardCommands } from './clipboard';
import { cursorCommands } from './cursor';
import { documentCommands } from './document';
import { historyCommands } from './history';
import { modeCommands } from './mode';
import { paintCommands } from './paint';
import { paletteCommands } from './palette';
import { selectionCommands } from './selection';
import { shareCommands } from './share';

const FEATURE_COMMANDS: CommandDefinition[] = [
  ...axisCommands,
  ...gridCommands,
  ...clipboardCommands,
  ...cursorCommands,
  ...documentCommands,
  ...historyCommands,
  ...modeCommands,
  ...paintCommands,
  ...paletteCommands,
  ...selectionCommands,
  ...shareCommands,
];

const COMMAND_DEFINITIONS: CommandDefinition[] = [...FEATURE_COMMANDS];

const registry = createCommandRegistry();
let registryInitialized = false;
const definitionMap = new Map<string, CommandDefinition>();


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
        { help: pattern.help ?? pattern.pattern },
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
  try {
    const result = def.handler({ engine, services: runtime }, args ?? {});
    if (result && typeof (result as any).then === 'function') {
      return (result as Promise<any>)
        .then((value) => {
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