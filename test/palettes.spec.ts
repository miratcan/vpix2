import { strict as assert } from 'node:assert';
import { describe, it, vi, afterEach, expect } from 'vitest';

import { normalizeSlug, getPaletteByName, registerPalette, fetchPaletteFromLospec, searchLospecPalettes } from '../core/palettes';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('palettes', () => {
  describe('normalizeSlug', () => {
    it('should normalize a slug', () => {
      assert.equal(normalizeSlug('  Pico-8 '), 'pico-8');
      assert.equal(normalizeSlug('Game Boy'), 'game-boy');
      assert.equal(normalizeSlug(' Commodore 64 '), 'commodore-64');
    });

    it('should handle weird slugs', () => {
      assert.equal(normalizeSlug('  a b c d e f g '), 'a-b-c-d-e-f-g');
      assert.equal(normalizeSlug('!@#$%^&*()_+'), '_');
      assert.equal(normalizeSlug(' a-b-c-d-e-f-g!@#$%^&*()_+'), 'a-b-c-d-e-f-g_');
    });
  });

  describe('getPaletteByName', () => {
    it('should get a palette by name', () => {
      const palette = getPaletteByName('pico-8');
      assert.ok(palette);
      assert.equal(palette.slug, 'pico-8');
      assert.equal(palette.colors.length, 16);
    });

    it('should handle legacy slugs', () => {
      const palette = getPaletteByName('gb-4-color');
      assert.ok(palette);
      assert.equal(palette.slug, 'game-boy');
    });

    it('should return null for unknown palettes', () => {
      const palette = getPaletteByName('unknown-palette');
      assert.equal(palette, null);
    });
  });

  describe('registerPalette', () => {
    it('should register a new palette', () => {
      const newPalette = ['#FF0000', '#00FF00', '#0000FF'];
      const { slug, colors } = registerPalette('my-palette', newPalette);
      assert.equal(slug, 'my-palette');
      assert.deepEqual(colors, newPalette);

      const retrieved = getPaletteByName('my-palette');
      assert.ok(retrieved);
      assert.equal(retrieved.slug, 'my-palette');
      assert.deepEqual(retrieved.colors, newPalette);
    });

    it('should handle hex codes without #', () => {
      const newPalette = ['FF0000', '00FF00', '0000FF'];
      const expectedPalette = ['#FF0000', '#00FF00', '#0000FF'];
      const { slug, colors } = registerPalette('my-palette-2', newPalette);
      assert.equal(slug, 'my-palette-2');
      assert.deepEqual(colors, expectedPalette);
    });
  });

  describe('fetchPaletteFromLospec', () => {
    it('should fetch and register a palette', async () => {
      const mockPalette = { colors: ['FF0000', '00FF00', '0000FF'] };
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockPalette,
      } as Response);

      const { slug, colors } = await fetchPaletteFromLospec('test-palette');

      assert.equal(slug, 'test-palette');
      assert.deepEqual(colors, ['#FF0000', '#00FF00', '#0000FF']);
      expect(fetchSpy).toHaveBeenCalledWith('https://lospec.com/palette-list/test-palette.json');
    });

    it('should throw on failed fetch', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 404 } as Response);
      await assert.rejects(() => fetchPaletteFromLospec('test-palette'), /fetch failed 404/);
    });
  });

  describe('searchLospecPalettes', () => {
    it('should search and filter palettes', async () => {
      const mockPalettes = [
        { slug: 'test-1', title: 'Test Palette 1' },
        { slug: 'another-2', title: 'Another Palette 2' },
        { slug: 'test-3', title: 'Third Test' },
      ];
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockPalettes,
      } as Response);

      const results = await searchLospecPalettes('test');
      assert.deepEqual(results, ['test-1', 'test-3']);
    });

    it('should return empty array on failed fetch', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false } as Response);
      const results = await searchLospecPalettes('test');
      assert.deepEqual(results, []);
    });
  });
});
