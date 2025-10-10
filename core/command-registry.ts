// Minimal word-based command registry with typed params and suggestions

export type Ctx = { engine: any; services?: Record<string, unknown> };

export type ParseResult<T> = { ok: true; value: T } | { ok: false; err?: string };
export type ParamType<T> = {
  name: string;
  placeholder?: string; // for suggest/help
  suggest?: (prefix: string) => string[]; // optional, for enums
  greedy?: boolean; // when true and last in pattern, consumes rest-of-line
  parse: (token: string) => ParseResult<T>;
}

export type LiteralSpec = { kind: 'lit'; word: string };
export type ParamSpec<T> = { kind: 'param'; name: string; type: ParamType<T> };
export type PatternEl = LiteralSpec | ParamSpec<any>;

export function literal(word: string): LiteralSpec { return { kind: 'lit', word }; }
export function param<T>(name: string, type: ParamType<T>): ParamSpec<T> { return { kind: 'param', name, type }; }

export type CommandMeta = {
  silent?: boolean;
  closeTerminal?: boolean;
  lines?: string[];
};

export function int(min: number, max: number): ParamType<number> {
  return {
    name: `int(${min}..${max})`, placeholder: '<int>',
    parse(token) {
      const n = parseInt(token, 10);
      if (Number.isNaN(n)) return { ok: false, err: 'not a number' };
      if (n < min || n > max) return { ok: false, err: `out of range ${min}..${max}` };
      return { ok: true, value: n };
    },
  };
}

export function size(): ParamType<{ w: number; h: number }> {
  return {
    name: 'size', placeholder: '<WxH>',
    parse(token) {
      const m = /^(\d+)x(\d+)$/i.exec(token.trim());
      if (!m) return { ok: false, err: 'expected WxH' };
      const w = parseInt(m[1], 10), h = parseInt(m[2], 10);
      if (!w || !h) return { ok: false } as any;
      return { ok: true, value: { w, h } };
    },
  };
}

export function oneOf<const T extends readonly string[]>(...vals: T): ParamType<T[number]> {
  return {
    name: `oneOf(${vals.join('|')})`, placeholder: `<${vals.join('|')}>`,
    parse(token) { return (vals as readonly string[]).includes(token) ? { ok: true, value: token as T[number] } : { ok: false, err: 'invalid choice' }; },
    suggest(prefix) { return (vals as readonly string[]).filter(v => v.startsWith(prefix)); },
  };
}

import { REGISTRY } from './palettes';

export function slug(): ParamType<string> {
  return {
    name: 'slug', placeholder: '<slug>',
    parse(token) { return { ok: true, value: token }; },
    suggest(prefix) {
      try { return Array.from(REGISTRY.keys()).filter((k) => k.startsWith(prefix.toLowerCase())); } catch { return []; }
    }
  };
}

type Registered = { pattern: PatternEl[]; handler: (ctx: Ctx, args: Record<string, unknown>) => any; help?: string };

export type CommandExecutionResult = { matched: boolean; ok: boolean; msg: string; meta?: CommandMeta };

function normalizeHandlerResult(ret: any): { ok: boolean; msg: string; meta?: CommandMeta } {
  if (ret == null) return { ok: true, msg: '' };
  if (typeof ret === 'string') return { ok: true, msg: ret };
  if (typeof ret === 'object') {
    const ok = typeof (ret as any).ok === 'boolean' ? Boolean((ret as any).ok) : true;
    const msg = 'msg' in ret ? String((ret as any).msg ?? '') : '';
    const baseMeta = buildMeta(ret);
    return { ok, msg, meta: baseMeta };
  }
  return { ok: true, msg: String(ret) };
}

function buildMeta(source: any): CommandMeta | undefined {
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

export function createRegistry() {
  const cmds: Registered[] = [];
  return {
    register(pattern: PatternEl[], handler: Registered['handler'], opts?: { help?: string }) {
      cmds.push({ pattern, handler, help: opts?.help });
    },
    registerS(pattern: string, handler: Registered['handler'], opts?: { help?: string }) {
      const compiled = compilePatternDSL(pattern);
      cmds.push({ pattern: compiled, handler, help: opts?.help });
    },
    execute(input: string, ctx: Ctx): CommandExecutionResult | Promise<CommandExecutionResult> {
      const tokens = tokenize(input);
      let usageOnPrefix: string | null = null;
      for (const c of cmds) {
        const res = matchPattern(tokens, c.pattern);
        if (res.matched && res.ok) {
          try {
            ctx.engine?.beginGroup(c.help || formatUsage(c.pattern));

            const ret = c.handler(ctx, res.args!);

            // ASYNC case
            if (ret && typeof (ret as any).then === 'function') {
              return (ret as Promise<any>)
                .then((out) => {
                  ctx.engine?.endGroup();
                  const norm = normalizeHandlerResult(out);
                  return { matched: true, ok: norm.ok, msg: norm.msg, meta: norm.meta };
                })
                .catch((err) => {
                  // Async error: group is not ended, so it's discarded.
                  console.error('Command failed (async):', err);
                  return { matched: true, ok: false, msg: 'command failed' };
                });
            }

            // SYNC case
            ctx.engine?.endGroup();
            const norm = normalizeHandlerResult(ret);
            return { matched: true, ok: norm.ok, msg: norm.msg, meta: norm.meta };

          } catch (err) {
            // Sync error: group is not ended, so it's discarded.
            console.error('Command failed (sync):', err);
            return { matched: true, ok: false, msg: 'command failed' };
          }
        } else if (res.matched) {
          usageOnPrefix = usageOnPrefix || (c.help || formatUsage(c.pattern));
          continue;
        }
      }
      if (usageOnPrefix) return { matched: true, ok: false, msg: `usage: ${usageOnPrefix}` };
      return { matched: false, ok: false, msg: 'unknown command' };
    },
    suggest(input: string): string[] {
      const tokens = tokenize(input);
      const last = tokens[tokens.length - 1] || '';
      const isEndingSpace = /\s$/.test(input);
      const candidates: string[] = [];
      for (const c of cmds) {
        const idx = isEndingSpace ? tokens.length : Math.max(0, tokens.length - 1);
        const prefixTokens = tokens.slice(0, idx);
        const match = matchPrefix(prefixTokens, c.pattern);
        if (!match) continue;
        const nextEl = c.pattern[idx];
        if (!nextEl) continue;
        if (nextEl.kind === 'lit') {
          const word = nextEl.word;
          if (isEndingSpace || word.startsWith(last)) candidates.push(word);
        } else {
          const ph = nextEl.type.placeholder || `<${nextEl.type.name}>`;
          // param suggest if provided, else placeholder
          const opts = nextEl.type.suggest?.(isEndingSpace ? '' : last) || [];
          if (opts.length) candidates.push(...opts);
          else candidates.push(ph);
        }
      }
      return Array.from(new Set(candidates));
    },
    help(prefix?: string): string[] {
      const list = cmds.map((c) => c.help || formatUsage(c.pattern));
      return prefix ? list.filter((h) => h.startsWith(prefix)) : list;
    },
  };
}

function formatUsage(pattern: PatternEl[]) {
  return pattern.map((el) => el.kind === 'lit' ? el.word : (el.type.placeholder || `<${el.type.name}>`)).join(' ');
}

function tokenize(input: string): string[] {
  // minimal: split by whitespace, ignore empty
  return input.trim().split(/\s+/g).filter(Boolean);
}

function matchPrefix(tokens: string[], pattern: PatternEl[]): boolean {
  if (tokens.length > pattern.length) return false;
  for (let i = 0; i < tokens.length; i++) {
    const el = pattern[i]; const t = tokens[i];
    if (!el) return false;
    if (el.kind === 'lit') { if (el.word !== t) return false; }
    else { const p = el.type.parse(t); if (!p.ok) return false; }
  }
  return true;
}

function matchPattern(tokens: string[], pattern: PatternEl[]): { matched: boolean; ok: boolean; args?: Record<string, unknown> } {
  if (!matchPrefix(tokens.slice(0, Math.min(tokens.length, pattern.length)), pattern)) return { matched: false, ok: false };
  const last = pattern[pattern.length - 1];
  const lastGreedy = !!(last && (last as any).kind === 'param' && (last as any).type.greedy);
  if (!lastGreedy) {
    if (tokens.length !== pattern.length) return { matched: true, ok: false };
  } else {
    if (tokens.length < pattern.length) return { matched: true, ok: false };
  }
  const args: Record<string, unknown> = {};
  for (let i = 0; i < pattern.length; i++) {
    const el: any = pattern[i];
    if (el.kind === 'lit') continue;
    if (i === pattern.length - 1 && el.type.greedy) {
      const rest = tokens.slice(i).join(' ');
      const p = el.type.parse(rest);
      if (!p.ok) return { matched: true, ok: false };
      args[el.name] = (p as any).value;
      break;
    } else {
      const t = tokens[i];
      const p = el.type.parse(t);
      if (!p.ok) return { matched: true, ok: false };
      args[el.name] = (p as any).value;
    }
  }
  return { matched: true, ok: true, args };
}

// ---- Pattern DSL compiler ----
// Syntax examples:
//  - "set W {value:int[1..256]}"
//  - "set size {size:size}"
//  - "set palette {slug:slug}"
//  - "set {key:oneof[W|H|size|palette]}" (not used yet)
function compilePatternDSL(spec: string): PatternEl[] {
  const parts = spec.trim().split(/\s+/g).filter(Boolean);
  const out: PatternEl[] = [];
  for (const p of parts) {
    const m = /^\{(?:(?<name>[a-zA-Z_][\w-]*)\:)?(?<type>[a-zA-Z_][\w-]*)(?:\[(?<cons>[^\]]+)\])?\}$/.exec(p);
    if (!m) { out.push(literal(p)); continue; }
    const name = m.groups?.name || m.groups?.type || 'arg';
    const t = (m.groups?.type || '').toLowerCase();
    const cons = m.groups?.cons || '';
    let paramType: ParamType<any> | null = null;
    if (t === 'int') {
      const mm = /^(\d+)\.\.(\d+)$/.exec(cons);
      const lo = mm ? parseInt(mm[1], 10) : 0;
      const hi = mm ? parseInt(mm[2], 10) : 9999;
      paramType = int(lo, hi);
    } else if (t === 'size') {
      paramType = size();
    } else if (t === 'oneof') {
      const opts = cons.split('|').map((s) => s.trim()).filter(Boolean);
      paramType = oneOf(...(opts as any));
    } else if (t === 'slug') {
      paramType = slug();
    } else if (t === 'url') {
      paramType = { name: 'url', placeholder: '<url>', parse: (tok) => ({ ok: true, value: tok }), greedy: true };
    } else if (t === 'json') {
      paramType = { name: 'json', placeholder: '<json>', parse: (tok) => { try { return { ok: true, value: JSON.parse(tok) }; } catch { return { ok: false, err: 'invalid json' }; } }, greedy: true };
    } else if (t === 'rest') {
      paramType = { name: 'rest', placeholder: '<text>', parse: (tok) => ({ ok: true, value: tok }), greedy: true };
    }
    if (!paramType) throw new Error(`unknown param type in pattern: ${p}`);
    out.push(param(name, paramType));
  }
  return out;
}
