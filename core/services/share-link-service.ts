import { decodeFromParamV2, decodeFromParamV2R, encodeToParamV2R, parseVp2Meta } from '../url';
import { PaletteService } from './palette-service';

import type VPixEngine from '../engine';

export type HistoryLike = {
  replaceState(data: unknown, unused: string, url?: string | URL): void;
};

export type ClipboardLike = {
  writeText(text: string): Promise<void>;
};

export type LocationProvider = () => URL | null;

function defaultLocation(): URL | null {
  try {
    if (typeof window !== 'undefined') {
      return new URL(window.location.href);
    }
  } catch {
    /* no-op */
  }
  return null;
}

function defaultHistory(): HistoryLike | null {
  try {
    if (typeof history !== 'undefined') {
      return history;
    }
  } catch {
    /* no-op */
  }
  return null;
}

function defaultClipboard(): ClipboardLike | null {
  try {
    const nav = typeof navigator !== 'undefined' ? navigator : null;
    return nav?.clipboard ?? null;
  } catch {
    return null;
  }
}

export class ShareLinkService {
  private readonly locate: LocationProvider;
  private readonly history: HistoryLike | null;
  private readonly clipboard: ClipboardLike | null;
  private readonly palettes: PaletteService;

  constructor(deps: {
    locate?: LocationProvider;
    history?: HistoryLike | null;
    clipboard?: ClipboardLike | null;
    palettes?: PaletteService;
  } = {}) {
    this.locate = deps.locate ?? defaultLocation;
    this.history = deps.history ?? defaultHistory();
    this.clipboard = deps.clipboard ?? defaultClipboard();
    this.palettes = deps.palettes ?? new PaletteService();
  }

  async loadFromLocation(engine: VPixEngine) {
    const url = this.locate();
    if (!url) return false;
    const qp2r = url.searchParams.get('vp2r');
    const qp2 = url.searchParams.get('vp2');
    if (!qp2r && !qp2) return false;
    let decoded: VPixEngine | null = null;
    if (qp2r) {
      decoded = decodeFromParamV2R(qp2r, (opts) => new VPixEngine(opts));
    } else if (qp2) {
      decoded = decodeFromParamV2(qp2, (opts) => new VPixEngine(opts));
    }
    if (!decoded) {
      const meta = parseVp2Meta(qp2r || qp2 || '');
      if (meta?.slug) {
        await this.palettes.fetchPalette(meta.slug);
        if (qp2r) decoded = decodeFromParamV2R(qp2r, (opts) => new VPixEngine(opts));
        else if (qp2) decoded = decodeFromParamV2(qp2, (opts) => new VPixEngine(opts));
      }
    }
    if (!decoded) return false;
    engine.loadSnapshot(decoded.toSnapshot());
    return true;
  }

  generatePayload(engine: VPixEngine) {
    const slug = this.palettes.findMatchingSlug(engine.palette) || 'pico-8';
    return encodeToParamV2R(engine, slug);
  }

  buildUrl(engine: VPixEngine) {
    const payload = this.generatePayload(engine);
    const url = this.locate();
    if (!url) return `?vp2r=${payload}`;
    url.searchParams.set('vp2r', payload);
    url.searchParams.delete('vp2');
    return url.toString();
  }

  updateHistory(engine: VPixEngine) {
    const url = this.locate();
    if (!url || !this.history) return { ok: false, msg: 'share links unavailable' } as const;
    const payload = this.generatePayload(engine);
    url.searchParams.set('vp2r', payload);
    url.searchParams.delete('vp2');
    this.history.replaceState(null, '', url.toString());
    return { ok: true, msg: 'link updated (?vp2r=...)' } as const;
  }

  async copyLink(engine: VPixEngine) {
    const url = this.buildUrl(engine);
    const warning = url.length > 2000 ? `warning: long URL (${url.length} chars)` : null;
    if (!this.clipboard?.writeText) {
      return { ok: false, msg: warning ? `${warning}; ${url}` : url } as const;
    }
    try {
      await this.clipboard.writeText(url);
      return { ok: true, msg: warning ? `link copied — ${warning}` : 'link copied' } as const;
    } catch {
      return { ok: false, msg: warning ? `${warning}; ${url}` : url } as const;
    }
  }
}
