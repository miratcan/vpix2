// Simple command executor for VPix
// Disabled direct palette color edits; rely on LoSpec palettes

import VPixEngine from './engine';
import { getPaletteByName, REGISTRY, fetchPaletteFromLospec, searchLospecPalettes } from './palettes';
import { createRegistry } from './command-registry';
import { encodeToParamV2R } from './url';
import { createRegistry } from './command-registry';

export function executeCommand(engine: VPixEngine, input: string): { ok: boolean; msg: string } | Promise<{ ok: boolean; msg: string }> {
  const cmd = (input || '').trim();
  if (!cmd) return { ok: false, msg: 'Empty command' };
  ensureRegistry();
  const out = (_registry as any).execute(cmd, { engine });
  if (out && typeof (out as any).then === 'function') {
    return (out as Promise<any>).then(({ matched, ok, msg }) => (matched ? { ok, msg } : { ok: false, msg: `Unknown command: ${cmd}` }));
  }
  const { matched, ok, msg } = out as { matched: boolean; ok: boolean; msg: string };
  return matched ? { ok, msg } : { ok: false, msg: `Unknown command: ${cmd}` };
}

// ---- Registry (incremental): set W/H/size/palette ----
const _registry = createRegistry();
let _registryInit = false;
function ensureRegistry() {
  if (_registryInit) return;
  _registryInit = true;
  (_registry as any).registerS('set W {value:int[1..256]}',
    (ctx: any, { value }: any) => { (ctx.engine as VPixEngine).setWidth(value as number); return `W=${value}`; },
    { help: 'set W <int(1..256)>' });
  (_registry as any).registerS('set H {value:int[1..256]}',
    (ctx: any, { value }: any) => { (ctx.engine as VPixEngine).setHeight(value as number); return `H=${value}`; },
    { help: 'set H <int(1..256)>' });
  (_registry as any).registerS('set size {size:size}',
    (ctx: any, { size: s }: any) => { (ctx.engine as VPixEngine).setSize(s.w, s.h); return `size=${s.w}x${s.h}`; },
    { help: 'set size <WxH>' });
  (_registry as any).registerS('set palette {slug:slug}',
    (ctx: any, { slug }: any) => {
      const pal = getPaletteByName(String(slug));
      if (!pal) return `unknown palette: ${slug}`;
      const eng = ctx.engine as VPixEngine;
      eng.palette = pal.colors;
      const lastIdx = eng.palette.length - 1;
      eng.currentColorIndex = Math.min(eng.currentColorIndex, lastIdx);
      eng.lastColorIndex = Math.min(eng.lastColorIndex, lastIdx);
      (eng as any)._emit?.();
      return `palette: ${pal.slug}`;
    }, { help: 'set palette <slug>' });

  // palette commands
  (_registry as any).registerS('palette use {slug:slug}', (ctx: any, { slug }: any) => {
    const pal = getPaletteByName(String(slug));
    if (!pal) return `unknown palette: ${slug}`;
    const eng = ctx.engine as VPixEngine;
    eng.palette = pal.colors;
    const lastIdx = eng.palette.length - 1;
    eng.currentColorIndex = Math.min(eng.currentColorIndex, lastIdx);
    eng.lastColorIndex = Math.min(eng.lastColorIndex, lastIdx);
    (eng as any)._emit?.();
    return `palette: ${pal.slug}`;
  }, { help: 'palette use <slug>' });

  (_registry as any).registerS('palette list', () => {
    const names = Array.from(REGISTRY.keys()).join(', ');
    return names ? `palettes: ${names}` : 'no palettes';
  }, { help: 'palette list' });

  (_registry as any).registerS('palette fetch {slug:slug}', async (_ctx: any, { slug }: any) => {
    const name = String(slug);
    const pal = await fetchPaletteFromLospec(name).catch(() => null);
    return pal ? `loaded: ${pal.slug} (${pal.colors.length})` : `failed to load: ${name}`;
  }, { help: 'palette fetch <slug>' });

  (_registry as any).registerS('palette search {term:rest}', async (_ctx: any, { term }: any) => {
    const t = String(term);
    const slugs = await searchLospecPalettes(t).catch(() => []);
    return slugs.length ? slugs.join(', ') : 'no results';
  }, { help: 'palette search <term>' });

  // read commands
  (_registry as any).registerS('read', (ctx: any) => {
    try {
      if (typeof localStorage !== 'undefined') {
        const key = 'vpix.document.v1';
        const data = localStorage.getItem(key);
        if (!data) return 'No saved document';
        const loaded = VPixEngine.deserialize(data);
        const eng = ctx.engine as VPixEngine;
        eng.width = loaded.width; eng.height = loaded.height; eng.palette = loaded.palette; eng.currentColorIndex = loaded.currentColorIndex; eng.grid = loaded.grid; (eng as any)._emit?.();
        return 'document loaded';
      }
      return 'storage not available';
    } catch { return 'read failed'; }
  }, { help: 'read' });

  (_registry as any).registerS('read json {doc:json}', (ctx: any, { doc }: any) => {
    try {
      const loaded = VPixEngine.deserialize(typeof doc === 'string' ? doc : JSON.stringify(doc));
      const eng = ctx.engine as VPixEngine;
      eng.width = loaded.width; eng.height = loaded.height; eng.palette = loaded.palette; eng.currentColorIndex = loaded.currentColorIndex; eng.grid = loaded.grid; (eng as any)._emit?.();
      return 'document loaded';
    } catch { return 'invalid json'; }
  }, { help: 'read json <{...}>' });

  (_registry as any).registerS('read url {url:url}', async (ctx: any, { url }: any) => {
    const u = String(url);
    try {
      const txt = await fetch(u as any).then((r) => (r as any).text());
      const loaded = VPixEngine.deserialize(txt);
      const eng = ctx.engine as VPixEngine;
      eng.width = loaded.width; eng.height = loaded.height; eng.palette = loaded.palette; eng.currentColorIndex = loaded.currentColorIndex; eng.grid = loaded.grid; (eng as any)._emit?.();
      return 'document loaded';
    } catch { return 'network error'; }
  }, { help: 'read url <https://...>' });

  // link/copylink
  (_registry as any).registerS('link', (ctx: any) => {
    try {
      const eng = ctx.engine as VPixEngine;
      let slug: string | null = null;
      for (const name of REGISTRY.keys()) {
        const p = getPaletteByName(name);
        if (p && JSON.stringify(p.colors) === JSON.stringify(eng.palette)) { slug = p.slug; break; }
      }
      const payload = encodeToParamV2R(eng, slug || 'pico-8');
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('vp2r', payload);
        history.replaceState(null, '', url.toString());
      }
      return 'link updated (?vp2r=...)';
    } catch { return 'link failed'; }
  }, { help: 'link' });

  (_registry as any).registerS('copylink', async (ctx: any) => {
    try {
      const eng = ctx.engine as VPixEngine;
      let slug: string | null = null;
      for (const name of REGISTRY.keys()) {
        const p = getPaletteByName(name);
        if (p && JSON.stringify(p.colors) === JSON.stringify(eng.palette)) { slug = p.slug; break; }
      }
      const payload = encodeToParamV2R(eng, slug || 'pico-8');
      let full = '';
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('vp2r', payload);
        full = url.toString();
      } else {
        full = `?vp2r=${payload}`;
      }
      if ((navigator as any)?.clipboard?.writeText) {
        await (navigator as any).clipboard.writeText(full).catch(() => {});
        return 'link copied';
      }
      return full;
    } catch { return 'copylink failed'; }
  }, { help: 'copylink' });

  // help
  (_registry as any).registerS('help', () => {
    const list = (_registry as any).help();
    return list.join('\n');
  }, { help: 'help' });
  (_registry as any).registerS('help {prefix:rest}', (_ctx: any, { prefix }: any) => {
    const list = (_registry as any).help(String(prefix));
    return list.join('\n');
  }, { help: 'help <prefix>' });
}

export function suggestCommands(input: string): string[] {
  ensureRegistry();
  return (_registry as any).suggest(input) as string[];
}

export function helpCommands(prefix?: string): string[] {
  ensureRegistry();
  return (_registry as any).help(prefix) as string[];
}
