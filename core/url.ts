// URL encode/decode (vp2/vp2r) using LoSpec palette slug + bit-packed pixels
import { getPaletteByName, normalizeSlug } from './palettes';

import type VPixEngine from './engine';

const B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const toB62 = (n: number) => { let x = Math.max(0, n | 0); if (x === 0) return '0'; let s = ''; while (x > 0) { s = B62[x % 62] + s; x = Math.floor(x / 62); } return s; };
const fromB62 = (s: string) => { let n = 0; for (const ch of s) { const v = B62.indexOf(ch); if (v < 0) throw new Error('bad base62'); n = n * 62 + v; } return n; };

function base64UrlEncode(bytes: Uint8Array) {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
  let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  const b64 = (typeof btoa === 'function' ? btoa(s) : '').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
  return b64;
}
function base64UrlDecodeToBytes(str: string) {
  const b64 = str.replace(/-/g,'+').replace(/_/g,'/');
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(b64, 'base64'));
  const bin = atob(b64); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out;
}

export function encodeToParamV2(engine: VPixEngine, paletteSlug?: string) {
  const { width: w, height: h, palette } = engine;
  const slug = normalizeSlug(paletteSlug) || 'pico-8';
  const nColors = palette.length;
  const bitsPer = Math.max(1, Math.ceil(Math.log2(nColors + 1)));
  const total = w * h; const totalBits = total * bitsPer;
  const bytes = new Uint8Array(Math.ceil(totalBits / 8));
  let bitPos = 0;
  const writeVal = (v: number) => { for (let b = bitsPer - 1; b >= 0; b--) { const bit = (v >> b) & 1; const byteIndex = bitPos >> 3; const bitIndex = 7 - (bitPos & 7); bytes[byteIndex] |= bit << bitIndex; bitPos++; } };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = engine.grid[y][x]; const idx = c == null ? 0 : Math.max(1, palette.indexOf(c) + 1); writeVal(idx); }
  const payload = `vp2;w${toB62(w)};h${toB62(h)};pl${slug};b${base64UrlEncode(bytes)};d${toB62(bitsPer)}`;
  return payload;
}

export function decodeFromParamV2(value: string, engineFactory: (opts: { width: number; height: number; palette: string[] }) => VPixEngine) {
  const s = (value || '').trim(); if (!s.startsWith('vp2;')) return null;
  const parts = s.split(';'); let w = 0, h = 0, slug: string | null = null, b64 = '', bitsPer = 0;
  for (const token of parts) {
    if (token.startsWith('w')) w = fromB62(token.slice(1));
    else if (token.startsWith('h')) h = fromB62(token.slice(1));
    else if (token.startsWith('pl')) slug = token.slice(2);
    else if (token.startsWith('b')) b64 = token.slice(1);
    else if (token.startsWith('d')) bitsPer = fromB62(token.slice(1));
  }
  if (!w || !h || !slug || !b64 || !bitsPer) return null;
  const pal = getPaletteByName(slug); if (!pal) return null; const palette = pal.colors;
  const buf = base64UrlDecodeToBytes(b64); const total = w * h; const eng = engineFactory({ width: w, height: h, palette });
  let bitPos = 0;
  for (let i = 0; i < total; i++) {
    let v = 0; for (let b = 0; b < bitsPer; b++) { const byteIndex = bitPos >> 3; const bitIndex = 7 - (bitPos & 7); const bit = (buf[byteIndex] >> bitIndex) & 1; v = (v << 1) | bit; bitPos++; }
    const y = Math.floor(i / w); const x = i % w; eng.grid[y][x] = v === 0 ? null : (palette[v - 1] || null);
  }
  return eng;
}

export function parseVp2Meta(value: string) {
  const s = (value || '').trim(); if (!s.startsWith('vp2;')) return null;
  const parts = s.split(';'); let w = 0, h = 0, slug: string | null = null;
  for (const token of parts) {
    if (token.startsWith('w')) w = fromB62(token.slice(1));
    else if (token.startsWith('h')) h = fromB62(token.slice(1));
    else if (token.startsWith('pl')) slug = token.slice(2);
  }
  if (!w || !h || !slug) return null; return { w, h, slug } as const;
}

export function encodeToParamV2R(engine: VPixEngine, paletteSlug?: string) {
  const { width: w, height: h, palette } = engine; const slug = normalizeSlug(paletteSlug) || 'pico-8';
  const nColors = palette.length; const bitsPer = Math.max(1, Math.ceil(Math.log2(nColors + 1)));
  const total = w * h; const totalBits = total * bitsPer; const bytes = new Uint8Array(Math.ceil(totalBits / 8));
  let bitPos = 0;
  const writeVal = (v: number) => { for (let b = bitsPer - 1; b >= 0; b--) { const bit = (v >> b) & 1; const byteIndex = bitPos >> 3; const bitIndex = 7 - (bitPos & 7); bytes[byteIndex] |= bit << bitIndex; bitPos++; } };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = engine.grid[y][x]; const idx = c == null ? 0 : Math.max(1, palette.indexOf(c) + 1); writeVal(idx); }
  const segs: string[] = [];
  for (let i = 0; i < bytes.length;) {
    if (bytes[i] === 0) { let j = i; while (j < bytes.length && bytes[j] === 0) j++; const count = j - i; segs.push(`z${toB62(count)}`); i = j; }
    else { let j = i; while (j < bytes.length && bytes[j] !== 0) j++; const len = j - i; const chunk = bytes.subarray(i, j); segs.push(`d${toB62(len)}:${base64UrlEncode(chunk)}`); i = j; }
  }
  const r = segs.join('.'); return `vp2r;w${toB62(w)};h${toB62(h)};pl${slug};d${toB62(bitsPer)};r${r}`;
}

export function decodeFromParamV2R(value: string, engineFactory: (opts: { width: number; height: number; palette: string[] }) => VPixEngine) {
  const s = (value || '').trim(); if (!s.startsWith('vp2r;')) return null;
  const parts = s.split(';'); let w = 0, h = 0, slug: string | null = null, r = '', bitsPer = 0;
  for (const token of parts) {
    if (token.startsWith('w')) w = fromB62(token.slice(1)); else if (token.startsWith('h')) h = fromB62(token.slice(1)); else if (token.startsWith('pl')) slug = token.slice(2); else if (token.startsWith('r')) r = token.slice(1); else if (token.startsWith('d')) bitsPer = fromB62(token.slice(1));
  }
  if (!w || !h || !slug || bitsPer <= 0) return null; const pal = getPaletteByName(slug); if (!pal) return null;
  const total = Math.ceil((w * h * bitsPer) / 8); const out = new Uint8Array(total); let offset = 0;
  if (r && r.length) {
    for (const seg of r.split('.')) {
      if (!seg) continue; if (seg[0] === 'z') { const count = fromB62(seg.slice(1)); offset += count; }
      else if (seg[0] === 'd') { const rest = seg.slice(1); const idx = rest.indexOf(':'); if (idx === -1) continue; const len = fromB62(rest.slice(0, idx)); const b64 = rest.slice(idx + 1); const chunk = base64UrlDecodeToBytes(b64); const copyLen = Math.min(len, chunk.length, total - offset); out.set(chunk.subarray(0, copyLen), offset); offset += copyLen; }
      if (offset >= total) break;
    }
  }
  const eng = engineFactory({ width: w, height: h, palette: pal.colors });
  let bitPos = 0; const readVal = () => { let v = 0; for (let b = 0; b < bitsPer; b++) { const byteIndex = bitPos >> 3; const bitIndex = 7 - (bitPos & 7); const bit = (out[byteIndex] >> bitIndex) & 1; v = (v << 1) | bit; bitPos++; } return v; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = readVal(); (eng as any).grid[y][x] = v === 0 ? null : (pal.colors[v - 1] || null); }
  return eng;
}

