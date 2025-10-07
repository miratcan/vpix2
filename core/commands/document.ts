import VPixEngine from '../engine';

import type { CommandDefinition } from './common';

function normalizeHex(color: string): string | null {
  let hex = color.trim();
  if (hex.startsWith('#')) hex = hex.slice(1);
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((ch) => ch + ch)
      .join('');
  }
  if (hex.length !== 6) return null;
  const value = Number.parseInt(hex, 16);
  if (Number.isNaN(value)) return null;
  return `#${hex.toUpperCase()}`;
}

function colorToRgba(color: string): [number, number, number, number] {
  const normalized = normalizeHex(color);
  if (!normalized) return [0, 0, 0, 255];
  const hex = normalized.slice(1);
  const value = Number.parseInt(hex, 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  return [r, g, b, 255];
}

function rgbaToHex(r: number, g: number, b: number): string {
  const toHex = (component: number) => component.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export const documentCommands: CommandDefinition[] = [
  {
    id: 'document.read',
    summary: 'Load last saved document',
    handler: ({ engine, services }) => {
      if (!services.documents) return 'storage not available';
      const doc = services.documents.load();
      if (!doc) return 'No saved document';
      engine.loadSnapshot(doc);
      return 'document loaded';
    },
    patterns: [{ pattern: 'read', help: 'read' }],
  },
  {
    id: 'document.read-json',
    summary: 'Load document from JSON',
    handler: ({ engine }, { doc }) => {
      try {
        const raw = typeof doc === 'string' ? doc : JSON.stringify(doc);
        const loaded = VPixEngine.deserialize(raw);
        engine.loadSnapshot(loaded.toSnapshot());
        return 'document loaded';
      } catch {
        return 'invalid json';
      }
    },
    patterns: [{ pattern: 'read json {doc:json}', help: 'read json <{...}>' }],
  },
  {
    id: 'document.read-url',
    summary: 'Fetch and load document from URL',
    handler: async ({ engine, services }, { url }) => {
      const fetchImpl = services.fetch;
      if (!fetchImpl) return 'network unavailable';
      try {
        const txt = await fetchImpl(String(url)).then((r) => r.text());
        const loaded = VPixEngine.deserialize(txt);
        engine.loadSnapshot(loaded.toSnapshot());
        return 'document loaded';
      } catch {
        return 'network error';
      }
    },
    patterns: [{ pattern: 'read url {url:url}', help: 'read url <https://...>' }],
  },
  {
    id: 'document.export',
    summary: 'Export current canvas as PNG',
    handler: ({ engine }) => {
      if (typeof document === 'undefined') return 'export unavailable';
      const target = document.body;
      if (!target) return 'export unavailable';

      const canvas = document.createElement('canvas');
      canvas.width = engine.width;
      canvas.height = engine.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return 'export unavailable';

      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const data = imageData.data;
      for (let y = 0; y < engine.height; y += 1) {
        for (let x = 0; x < engine.width; x += 1) {
          const idx = (y * canvas.width + x) * 4;
          const colorIndex = engine.grid[y][x];
          if (colorIndex == null) {
            data[idx] = 0;
            data[idx + 1] = 0;
            data[idx + 2] = 0;
            data[idx + 3] = 0;
            continue;
          }
          const color = engine.palette[colorIndex];
          const [r, g, b, a] = colorToRgba(color ?? '#000000');
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = a;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.download = `vpix-${timestamp}.png`;
      link.href = url;
      link.style.display = 'none';
      target.appendChild(link);
      try {
        link.click();
      } finally {
        link.remove();
      }

      return { msg: `exported ${canvas.width}×${canvas.height}`, meta: { closeTerminal: true } };
    },
    patterns: [{ pattern: 'export', help: 'export' }],
  },
  {
    id: 'document.import',
    summary: 'Import PNG into canvas',
    handler: ({ engine }) => {
      if (typeof document === 'undefined') return 'import unavailable';
      const target = document.body;
      if (!target) return 'import unavailable';

      return new Promise<string | { ok: boolean; msg: string; meta?: { closeTerminal?: boolean } }>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/png';
        input.style.display = 'none';

        const cleanup = () => {
          input.remove();
        };

        input.addEventListener('change', () => {
          const file = input.files?.[0];
          if (!file) {
            cleanup();
            resolve({ ok: false, msg: 'import cancelled' });
            return;
          }

          const reader = new FileReader();
          reader.onerror = () => {
            cleanup();
            resolve({ ok: false, msg: 'import failed' });
          };
          reader.onload = () => {
            const result = typeof reader.result === 'string' ? reader.result : '';
            if (!result) {
              cleanup();
              resolve({ ok: false, msg: 'invalid image' });
              return;
            }
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                  cleanup();
                  resolve({ ok: false, msg: 'import unavailable' });
                  return;
                }
                ctx.drawImage(img, 0, 0);
                const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const palette = engine.palette.slice();
                const colorMap = new Map<string, number>();
                palette.forEach((color, idx) => {
                  const normalized = normalizeHex(color);
                  if (normalized) colorMap.set(normalized, idx);
                });
                const grid = Array.from({ length: height }, (_, y) => {
                  const row: Array<number | null> = [];
                  for (let x = 0; x < width; x += 1) {
                    const offset = (y * width + x) * 4;
                    const alpha = data[offset + 3];
                    if (alpha < 128) {
                      row.push(null);
                      continue;
                    }
                    const hex = normalizeHex(rgbaToHex(data[offset], data[offset + 1], data[offset + 2]));
                    if (!hex) {
                      row.push(null);
                      continue;
                    }
                    let colorIndex = colorMap.get(hex);
                    if (colorIndex == null) {
                      if (palette.length >= 256) {
                        colorIndex = 0;
                      } else {
                        palette.push(hex);
                        colorIndex = palette.length - 1;
                        colorMap.set(hex, colorIndex);
                      }
                    }
                    row.push(colorIndex);
                  }
                  return row;
                });

                const snapshot = engine.toSnapshot();
                snapshot.width = width;
                snapshot.height = height;
                snapshot.grid = grid;
                snapshot.palette = palette;
                const paletteCount = palette.length > 0 ? palette.length : 1;
                snapshot.currentColorIndex = Math.min(snapshot.currentColorIndex, paletteCount - 1);
                engine.loadSnapshot(snapshot);

                cleanup();
                resolve({ msg: `imported ${width}×${height}`, meta: { closeTerminal: true } });
              } catch {
                cleanup();
                resolve({ ok: false, msg: 'import failed' });
              }
            };
            img.onerror = () => {
              cleanup();
              resolve({ ok: false, msg: 'invalid image' });
            };
            img.src = result;
          };
          reader.readAsDataURL(file);
        });

        target.appendChild(input);
        input.click();
      });
    },
    patterns: [{ pattern: 'import', help: 'import' }],
  },
];
