import VPixEngine from '../engine';
import { getPaletteByName } from '../palettes';

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
    id: 'document.new',
    summary: 'Start a new document (clear canvas, reset palette, reset cursor)',
    handler: ({ engine }) => {
      // Reset cursor to top-left first (before clearing canvas for history)
      engine.cursor.setPosition(0, 0);

      // Reset color index to first color
      engine.setColorIndex(0);

      // Clear any pending operations
      engine.clearPrefix();
      engine.clearPendingOperator();

      // Clear the canvas
      engine.clearCanvas();

      // Reset palette to default (pico-8)
      const defaultPalette = getPaletteByName('pico-8');
      if (defaultPalette) {
        engine.setPalette(defaultPalette.colors);
      }

      return { msg: 'Started new document.', meta: { closeTerminal: true } };
    },
    patterns: [{ pattern: 'new', help: 'new' }],
  },
  {
    id: 'document.read',
    summary: 'Load last saved document',
    handler: ({ engine, services }) => {
      if (!services.documents) return 'Storage not available.';
      const doc = services.documents.load();
      if (!doc) return 'No saved document found.';
      engine.loadSnapshot(doc);
      return 'Loaded last saved document.';
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
        return 'Loaded document from JSON.';
      } catch {
        return 'Invalid JSON data.';
      }
    },
    patterns: [{ pattern: 'read json {doc:json}', help: 'read json <{...}>' }],
  },
  {
    id: 'document.read-url',
    summary: 'Fetch and load document from URL',
    handler: async ({ engine, services }, { url }) => {
      const fetchImpl = services.fetch;
      if (!fetchImpl) return 'Network services unavailable.';
      try {
        const txt = await fetchImpl(String(url)).then((r) => r.text());
        const loaded = VPixEngine.deserialize(txt);
        engine.loadSnapshot(loaded.toSnapshot());
        return 'Loaded document from URL.';
      } catch {
        return 'A network error occurred while downloading the document.';
      }
    },
    patterns: [{ pattern: 'read url {url:url}', help: 'read url <https://...>' }],
  },
  {
    id: 'document.export',
    summary: 'Export current canvas as PNG',
    handler: ({ engine }) => {
      if (typeof document === 'undefined') return 'Export feature is not available.';
      const target = document.body;
      if (!target) return 'Export feature is not available.';

      const canvas = document.createElement('canvas');
      canvas.width = engine.grid.width;
      canvas.height = engine.grid.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return 'Export feature is not available.';

      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const data = imageData.data;
      for (let y = 0; y < engine.grid.height; y += 1) {
        for (let x = 0; x < engine.grid.width; x += 1) {
          const idx = (y * canvas.width + x) * 4;
          const colorIndex = engine.grid.cells[y][x];
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

      return { msg: `Exported ${canvas.width}x${canvas.height} PNG file.`, meta: { closeTerminal: true } };
    },
    patterns: [{ pattern: 'export', help: 'export' }],
  },
  {
    id: 'document.import',
    summary: 'Import PNG into canvas',
    handler: ({ engine }) => {
      if (typeof document === 'undefined') return 'Import feature is not available.';
      const target = document.body;
      if (!target) return 'Import feature is not available.';

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
            resolve({ ok: false, msg: 'Import cancelled.' });
            return;
          }

          const reader = new FileReader();
          reader.onerror = () => {
            cleanup();
            resolve({ ok: false, msg: 'Import failed.' });
          };
          reader.onload = () => {
            const result = typeof reader.result === 'string' ? reader.result : '';
            if (!result) {
              cleanup();
              resolve({ ok: false, msg: 'Invalid image file.' });
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
                  resolve({ ok: false, msg: 'Import feature is not available.' });
                  return;
                }
                ctx.drawImage(img, 0, 0);
                const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const paletteFromImage: string[] = [];
                const colorMap = new Map<string, number>();
                const ensureColorIndex = (hex: string) => {
                  const existing = colorMap.get(hex);
                  if (existing != null) return existing;
                  if (paletteFromImage.length >= 256) {
                    colorMap.set(hex, 0);
                    return 0;
                  }
                  const index = paletteFromImage.length;
                  paletteFromImage.push(hex);
                  colorMap.set(hex, index);
                  return index;
                };
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
                    const colorIndex = ensureColorIndex(hex);
                    row.push(colorIndex);
                  }
                  return row;
                });

                const snapshot = engine.toSnapshot();
                snapshot.width = width;
                snapshot.height = height;
                snapshot.grid = grid;
                const nextPalette =
                  paletteFromImage.length > 0 ? paletteFromImage : engine.palette.slice();
                snapshot.palette = nextPalette;
                const paletteCount = nextPalette.length > 0 ? nextPalette.length : 1;
                snapshot.currentColorIndex = Math.min(snapshot.currentColorIndex, paletteCount - 1);
                engine.loadSnapshot(snapshot);

                cleanup();
                resolve({ msg: `Imported ${width}x${height} PNG file.`, meta: { closeTerminal: true } });
              } catch {
                cleanup();
                resolve({ ok: false, msg: 'Import failed.' });
              }
            };
            img.onerror = () => {
              cleanup();
              resolve({ ok: false, msg: 'Invalid image file.' });
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
