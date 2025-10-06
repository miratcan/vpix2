// Minimal LoSpec-like palette registry (extensible)

const GAME_BOY = ['#0F380F', '#306230', '#8BAC0F', '#9BBC0F'];

export const REGISTRY = new Map<string, string[]>([
  ['pico-8', [
    '#000000', '#1D2B53', '#7E2553', '#008751', '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8',
    '#FF004D', '#FFA300', '#FFEC27', '#00E436', '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA',
  ]],
  ['sweetie-16', [
    '#1A1C2C', '#5D275D', '#B13E53', '#EF7D57', '#FFCD75', '#A7F070', '#38B764', '#257179',
    '#29366F', '#3B5DC9', '#41A6F6', '#73EFF7', '#F4F4F4', '#94B0C2', '#566C86', '#333C57',
  ]],
  ['game-boy', GAME_BOY],
  ['commodore-64', [
    '#000000', '#FFFFFF', '#68372B', '#70A4B2', '#6F3D86', '#588D43', '#352879', '#B8C76F',
    '#6F4F25', '#433900', '#9A6759', '#444444', '#6C6C6C', '#9AD284', '#6C5EB5', '#959595',
  ]],
  ['cga-16', [
    '#000000', '#0000AA', '#00AA00', '#00AAAA', '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA',
    '#555555', '#5555FF', '#55FF55', '#55FFFF', '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF',
  ]],
  ['ega-16', [
    '#000000', '#0000AA', '#00AA00', '#00AAAA', '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA',
    '#555555', '#5555FF', '#55FF55', '#55FFFF', '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF',
  ]],
  ['vga-16', [
    '#000000', '#800000', '#008000', '#808000', '#000080', '#800080', '#008080', '#C0C0C0',
    '#808080', '#FF0000', '#00FF00', '#FFFF00', '#0000FF', '#FF00FF', '#00FFFF', '#FFFFFF',
  ]],
  ['zx-spectrum', [
    '#000000', '#0000D7', '#D70000', '#D700D7', '#00D700', '#00D7D7', '#D7D700', '#D7D7D7',
    '#000000', '#0000FF', '#FF0000', '#FF00FF', '#00FF00', '#00FFFF', '#FFFF00', '#FFFFFF',
  ]],
  ['apple-ii-6', ['#000000', '#DD0033', '#6644FF', '#00AA33', '#FF9933', '#FFFFFF']],
  ['msx-16', [
    '#000000', '#000000', '#21C842', '#5EDC78', '#5455ED', '#7D76FC', '#D4524D', '#42EBF5',
    '#FC5554', '#FF7978', '#D4C154', '#E6CE80', '#21B03B', '#C95BBA', '#CCCCCC', '#FFFFFF',
  ]],
]);

const LEGACY_SLUGS = new Map<string, string>([
  ['gb-4-color', 'game-boy'],
]);

export function normalizeSlug(name: string) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_.]/g, '');
}

export function getPaletteByName(name: string): { slug: string; colors: string[] } | null {
  let slug = normalizeSlug(name);
  if (LEGACY_SLUGS.has(slug)) slug = LEGACY_SLUGS.get(slug)!;
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

