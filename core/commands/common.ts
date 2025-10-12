import type VPixEngine from '../engine';
import { MODES, type MotionKind, type OperatorKind } from '../engine';
import { createRegistry, type CommandExecutionResult, type CommandMeta } from '../command-registry';
import { KEYBINDINGS } from '../keybindings';
import { DocumentRepository, type IDocumentRepository } from '../services/document-repository';
import { PaletteService, type IPaletteService } from '../services/palette-service';
import { ShareLinkService, type IShareLinkService } from '../services/share-link-service';

export type CommandServices = {
  documents?: IDocumentRepository | null;
  palettes?: IPaletteService | null;
  shareLinks?: IShareLinkService | null;
  fetch?: typeof fetch;
};

export type RuntimeServices = {
  documents?: IDocumentRepository | null;
  palettes: IPaletteService;
  shareLinks: IShareLinkService;
  fetch?: typeof fetch;
};

export type CommandContext = { engine: VPixEngine; services: RuntimeServices };

export type CommandResult = { ok: boolean; msg: string; meta?: CommandMeta };

export type CommandHandlerReturn =
  | void
  | string
  | CommandResult
  | {
      ok?: boolean;
      msg?: string;
      meta?: CommandMeta;
      silent?: boolean;
      closeTerminal?: boolean;
      lines?: string[];
    };

export type CommandHandler = (
  ctx: CommandContext,
  args: Record<string, unknown>,
) => CommandHandlerReturn | Promise<CommandHandlerReturn>;

export type CommandPattern = {
  pattern: string;
  help?: string;
  mapArgs?: (args: Record<string, unknown>) => Record<string, unknown>;
};

export type CommandDefinition = {
  id: string;
  summary: string;
  handler: CommandHandler;
  patterns: CommandPattern[];
  hidden?: boolean;
  managesHistory?: boolean;
};

const STORAGE_KEY = 'vpix.document.v1';
const defaultPalettes = new PaletteService();
const defaultShareLinks = new ShareLinkService();
const defaultDocuments = new DocumentRepository(STORAGE_KEY);

export function resolveServices(services?: CommandServices): RuntimeServices {
  return {
    documents: services?.documents ?? defaultDocuments,
    palettes: services?.palettes ?? defaultPalettes,
    shareLinks: services?.shareLinks ?? defaultShareLinks,
    fetch: services?.fetch ?? (typeof fetch === 'function' ? fetch : undefined),
  };
}

export function ensureCount(value: unknown) {
  const n = Number(value ?? 1);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.max(1, Math.floor(n));
}

export function buildMeta(source: any): CommandMeta | undefined {
  if (!source || typeof source !== 'object') return undefined;
  const meta: CommandMeta = {};
  if (source.meta && typeof source.meta === 'object') {
    Object.assign(meta, source.meta);
  }
  if ('silent' in source && source.silent != null) meta.silent = Boolean(source.silent);
  if ('closeTerminal' in source && source.closeTerminal != null) meta.closeTerminal = Boolean(source.closeTerminal);
  if ('lines' in source && source.lines != null) {
    const lines = Array.isArray(source.lines)
      ? source.lines.map((ln: unknown) => String(ln))
      : [String(source.lines)];
    meta.lines = lines;
  }
  return Object.keys(meta).length ? meta : undefined;
}

export function normalizeCommandResult(ret: any): CommandResult {
  if (ret == null) return { ok: true, msg: '' };
  if (typeof ret === 'string') return { ok: true, msg: ret };
  if (typeof ret === 'object') {
    const ok = 'ok' in ret ? Boolean((ret as any).ok) : true;
    const msg = 'msg' in ret ? String((ret as any).msg ?? '') : '';
    const meta = buildMeta(ret);
    return { ok, msg, meta };
  }
  return { ok: true, msg: String(ret) };
}

export function createCommandRegistry() {
  return createRegistry();
}

// For new keymap system
export type Command = string; // The ID of a command, e.g., 'canvas.clear'
export type Keymap = Map<string, Command>;

export { CommandExecutionResult, CommandMeta, KEYBINDINGS, MODES };
export type { MotionKind, OperatorKind };
