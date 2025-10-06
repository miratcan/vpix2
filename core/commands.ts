// Simple command executor for VPix
// Disabled direct palette color edits; rely on LoSpec palettes

import { createRegistry } from './command-registry';
import VPixEngine from './engine';
import { DocumentRepository } from './services/document-repository';
import { PaletteService } from './services/palette-service';
import { ShareLinkService } from './services/share-link-service';

export type CommandServices = {
  documents?: DocumentRepository | null;
  palettes?: PaletteService | null;
  shareLinks?: ShareLinkService | null;
  fetch?: typeof fetch;
};

type RuntimeServices = {
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

export function executeCommand(
  engine: VPixEngine,
  input: string,
  services?: CommandServices,
): { ok: boolean; msg: string } | Promise<{ ok: boolean; msg: string }> {
  const cmd = (input || '').trim();
  if (!cmd) return { ok: false, msg: 'Empty command' };
  ensureRegistry();
  const runtime = resolveServices(services);
  const out = (_registry as any).execute(cmd, { engine, services: runtime });
  if (out && typeof (out as any).then === 'function') {
    return (out as Promise<any>).then(({ matched, ok, msg }) =>
      matched ? { ok, msg } : { ok: false, msg: `Unknown command: ${cmd}` },
    );
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
  (_registry as any).registerS(
    'set W {value:int[1..256]}',
    (ctx: any, { value }: any) => {
      (ctx.engine as VPixEngine).setWidth(value as number);
      return `W=${value}`;
    },
    { help: 'set W <int(1..256)>' },
  );
  (_registry as any).registerS(
    'set H {value:int[1..256]}',
    (ctx: any, { value }: any) => {
      (ctx.engine as VPixEngine).setHeight(value as number);
      return `H=${value}`;
    },
    { help: 'set H <int(1..256)>' },
  );
  (_registry as any).registerS(
    'set size {size:size}',
    (ctx: any, { size: s }: any) => {
      (ctx.engine as VPixEngine).setSize(s.w, s.h);
      return `size=${s.w}x${s.h}`;
    },
    { help: 'set size <WxH>' },
  );
  (_registry as any).registerS(
    'set palette {slug:slug}',
    (ctx: any, { slug }: any) => {
      const { palettes } = ctx.services as RuntimeServices;
      const eng = ctx.engine as VPixEngine;
      const applied = palettes.applyPalette(eng, String(slug));
      return applied ? `palette: ${String(slug)}` : `unknown palette: ${slug}`;
    },
    { help: 'set palette <slug>' },
  );

  // palette commands
  (_registry as any).registerS(
    'palette use {slug:slug}',
    (ctx: any, { slug }: any) => {
      const { palettes } = ctx.services as RuntimeServices;
      const eng = ctx.engine as VPixEngine;
      const applied = palettes.applyPalette(eng, String(slug));
      return applied ? `palette: ${String(slug)}` : `unknown palette: ${slug}`;
    },
    { help: 'palette use <slug>' },
  );

  (_registry as any).registerS(
    'palette list',
    (ctx: any) => {
      const { palettes } = ctx.services as RuntimeServices;
      const names = palettes.listRegistrySlugs().join(', ');
      return names ? `palettes: ${names}` : 'no palettes';
    },
    { help: 'palette list' },
  );

  (_registry as any).registerS(
    'palette fetch {slug:slug}',
    async (ctx: any, { slug }: any) => {
      const { palettes } = ctx.services as RuntimeServices;
      const pal = await palettes.fetchPalette(String(slug));
      return pal ? `loaded: ${pal.slug} (${pal.colors.length})` : `failed to load: ${String(slug)}`;
    },
    { help: 'palette fetch <slug>' },
  );

  (_registry as any).registerS(
    'palette search {term:rest}',
    async (ctx: any, { term }: any) => {
      const { palettes } = ctx.services as RuntimeServices;
      const results = await palettes.searchRemote(String(term));
      return results.length ? results.join(', ') : 'no results';
    },
    { help: 'palette search <term>' },
  );

  // read commands
  (_registry as any).registerS(
    'read',
    (ctx: any) => {
      const { documents } = ctx.services as RuntimeServices;
      if (!documents) return 'storage not available';
      const doc = documents.load();
      if (!doc) return 'No saved document';
      (ctx.engine as VPixEngine).loadSnapshot(doc);
      return 'document loaded';
    },
    { help: 'read' },
  );

  (_registry as any).registerS(
    'read json {doc:json}',
    (ctx: any, { doc }: any) => {
      try {
        const raw = typeof doc === 'string' ? doc : JSON.stringify(doc);
        const loaded = VPixEngine.deserialize(raw);
        (ctx.engine as VPixEngine).loadSnapshot(loaded.toSnapshot());
        return 'document loaded';
      } catch {
        return 'invalid json';
      }
    },
    { help: 'read json <{...}>' },
  );

  (_registry as any).registerS(
    'read url {url:url}',
    async (ctx: any, { url }: any) => {
      const { fetch: fetchImpl } = ctx.services as RuntimeServices;
      if (!fetchImpl) return 'network unavailable';
      try {
        const txt = await fetchImpl(String(url)).then((r: any) => r.text());
        const loaded = VPixEngine.deserialize(txt);
        (ctx.engine as VPixEngine).loadSnapshot(loaded.toSnapshot());
        return 'document loaded';
      } catch {
        return 'network error';
      }
    },
    { help: 'read url <https://...>' },
  );

  // link/copylink
  (_registry as any).registerS(
    'link',
    (ctx: any) => {
      const { shareLinks } = ctx.services as RuntimeServices;
      const res = shareLinks.updateHistory(ctx.engine as VPixEngine);
      return res.msg;
    },
    { help: 'link' },
  );

  (_registry as any).registerS(
    'copylink',
    async (ctx: any) => {
      const { shareLinks } = ctx.services as RuntimeServices;
      const res = await shareLinks.copyLink(ctx.engine as VPixEngine);
      return res.msg;
    },
    { help: 'copylink' },
  );

  // help
  (_registry as any).registerS(
    'help',
    () => {
      const list = (_registry as any).help();
      return list.join('\n');
    },
    { help: 'help' },
  );
  (_registry as any).registerS(
    'help {prefix:rest}',
    (_ctx: any, { prefix }: any) => {
      const list = (_registry as any).help(String(prefix));
      return list.join('\n');
    },
    { help: 'help <prefix>' },
  );
}

export function suggestCommands(input: string): string[] {
  ensureRegistry();
  return (_registry as any).suggest(input) as string[];
}

export function helpCommands(prefix?: string): string[] {
  ensureRegistry();
  return (_registry as any).help(prefix) as string[];
}
