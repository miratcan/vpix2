// Minimal LoSpec-like palette registry (extensible)

export const REGISTRY = new Map<string, string[]>([
  ['pico-8', [
    '#000000','#1D2B53','#7E2553','#008751','#AB5236','#5F574F','#C2C3C7','#FFF1E8',
    '#FF004D','#FFA300','#FFEC27','#00E436','#29ADFF','#83769C','#FF77A8','#FFCCAA',
  ]],
  ['sweetie-16', [
    '#1A1C2C','#5D275D','#B13E53','#EF7D57','#FFCD75','#A7F070','#38B764','#257179',
    '#29366F','#3B5DC9','#41A6F6','#73EFF7','#F4F4F4','#94B0C2','#566C86','#333C57',
  ]],
  ['gb-4-color', ['#0F380F','#306230','#8BAC0F','#9BBC0F']],
  ['mono-2', ['#000000','#FFFFFF']],
]);

export function normalizeSlug(name: string) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_.]/g, '');
}

export function getPaletteByName(name: string): { slug: string; colors: string[] } | null {
  const slug = normalizeSlug(name);
  if (REGISTRY.has(slug)) return { slug, colors: REGISTRY.get(slug)! };
  return null;
}

export function registerPalette(slug: string, colors: string[]) {
  const s = normalizeSlug(slug);
  const list = (colors || []).map((c) => (c.startsWith('#') ? c.toUpperCase() : `#${c.toUpperCase()}`));
  if (list.length > 0) REGISTRY.set(s, list);
  return { slug: s, colors: REGISTRY.get(s)! };
}

export async function fetchPaletteFromLospec(slug: string) {
  const s = normalizeSlug(slug);
  const url = `https://lospec.com/palette-list/${s}.json`;
  const res = await fetch(url as any);
  if (!(res as any).ok) throw new Error(`fetch failed ${(res as any).status}`);
  const data = await (res as any).json();
  if (!data || !Array.isArray(data.colors)) throw new Error('invalid palette json');
  const { colors } = data as { colors: string[] };
  return registerPalette(s, colors);
}

export async function searchLospecPalettes(term: string) {
  const q = String(term || '').trim().toLowerCase();
  if (!q) return [] as string[];
  try {
    const res = await fetch('https://lospec.com/palette-list.json' as any);
    if (!(res as any).ok) return [] as string[];
    const arr = await (res as any).json();
    return (arr as any[])
      .filter((p) => (p.slug && (p.slug.toLowerCase().includes(q) || (p.title || '').toLowerCase().includes(q))))
      .slice(0, 20)
      .map((p) => p.slug as string);
  } catch {
    return [] as string[];
  }
}

