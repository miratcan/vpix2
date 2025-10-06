import { getPaletteByName, REGISTRY, fetchPaletteFromLospec, searchLospecPalettes } from '../palettes';

import type VPixEngine from '../engine';

function colorsEqual(a: ReadonlyArray<string | null>, b: ReadonlyArray<string | null>) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export interface IPaletteService {
  listRegistrySlugs(): string[];
  searchRegistry(prefix: string): string[];
  getPaletteBySlug(slug: string): { slug: string; colors: string[] } | null;
  applyPalette(engine: VPixEngine, slug: string): boolean;
  findMatchingSlug(palette: readonly string[]): string | null;
  fetchPalette(slug: string, fetcher?: typeof fetch): Promise<{ slug: string; colors: string[] } | null>;
  searchRemote(term: string, fetcher?: typeof fetch): Promise<string[]>;
}

export class PaletteService implements IPaletteService {
  constructor(private readonly defaultFetch: typeof fetch | undefined = typeof fetch === 'function' ? fetch : undefined) {}

  private resolveFetch(fetcher?: typeof fetch) {
    return fetcher ?? this.defaultFetch;
  }

  listRegistrySlugs() {
    return Array.from(REGISTRY.keys());
  }

  searchRegistry(prefix: string) {
    const term = prefix.trim().toLowerCase();
    if (!term) return this.listRegistrySlugs();
    return this.listRegistrySlugs().filter((slug) => slug.startsWith(term));
  }

  getPaletteBySlug(slug: string) {
    return getPaletteByName(slug);
  }

  applyPalette(engine: VPixEngine, slug: string) {
    const pal = getPaletteByName(slug);
    if (!pal) return false;
    engine.setPalette(pal.colors);
    return true;
  }

  findMatchingSlug(palette: readonly string[]) {
    for (const [slug, colors] of REGISTRY.entries()) {
      if (colorsEqual(colors, palette)) {
        return slug;
      }
    }
    return null;
  }

  async fetchPalette(slug: string, fetcher?: typeof fetch) {
    const impl = this.resolveFetch(fetcher);
    if (!impl) return null;
    try {
      const pal = await fetchPaletteFromLospec(slug, impl);
      return pal;
    } catch {
      return null;
    }
  }

  async searchRemote(term: string, fetcher?: typeof fetch) {
    const impl = this.resolveFetch(fetcher);
    if (!impl) return [];
    return searchLospecPalettes(term, impl).catch(() => []);
  }
}
