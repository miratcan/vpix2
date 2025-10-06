import { getPaletteByName, REGISTRY, fetchPaletteFromLospec, searchLospecPalettes } from '../palettes';

import type VPixEngine from '../engine';

function colorsEqual(a: ReadonlyArray<string | null>, b: ReadonlyArray<string | null>) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export class PaletteService {
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

  async fetchPalette(slug: string) {
    try {
      const pal = await fetchPaletteFromLospec(slug);
      return pal;
    } catch {
      return null;
    }
  }

  async searchRemote(term: string) {
    return searchLospecPalettes(term).catch(() => []);
  }
}
