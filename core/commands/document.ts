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
    summary: 'Export current canvas as PNG with optional scale (1x-64x)',
    handler: ({ engine }, { scale }) => {
      if (typeof document === 'undefined') return 'Export feature is not available.';
      const target = document.body;
      if (!target) return 'Export feature is not available.';

      // Parse scale parameter (default to 1x)
      const pixelScale = typeof scale === 'number' ? Math.max(1, Math.min(64, scale)) : 1;

      const canvas = document.createElement('canvas');
      canvas.width = engine.grid.width * pixelScale;
      canvas.height = engine.grid.height * pixelScale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return 'Export feature is not available.';

      // Fill background with transparent
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw each pixel as a scaled square
      for (let y = 0; y < engine.grid.height; y += 1) {
        for (let x = 0; x < engine.grid.width; x += 1) {
          const colorIndex = engine.grid.cells[y][x];
          if (colorIndex == null) continue; // Skip transparent pixels

          const color = engine.palette[colorIndex];
          if (!color) continue;

          ctx.fillStyle = color;
          ctx.fillRect(x * pixelScale, y * pixelScale, pixelScale, pixelScale);
        }
      }

      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const scaleText = pixelScale > 1 ? `-${pixelScale}x` : '';
      link.download = `vpix-${timestamp}${scaleText}.png`;
      link.href = url;
      link.style.display = 'none';
      target.appendChild(link);
      try {
        link.click();
      } finally {
        link.remove();
      }

      const scaleMsg = pixelScale > 1 ? ` at ${pixelScale}x scale` : '';
      return { msg: `Exported ${canvas.width}x${canvas.height} PNG file${scaleMsg}.`, meta: { closeTerminal: true } };
    },
    patterns: [
      { pattern: 'export', help: 'export' },
      { pattern: 'export {scale:int[1..64]}', help: 'export <scale>' },
    ],
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
