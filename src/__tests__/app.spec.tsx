import { getPaletteByName } from '../../core/palettes';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const ENGINE_REF = '__vpix_test_engine__';

vi.mock('../../core/engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../core/engine')>();
  const pico = getPaletteByName('pico-8')!;
  class InstrumentedEngine extends actual.default {
    constructor(...args: ConstructorParameters<typeof actual.default>) {
      const config = args[0] || { palette: pico.colors };
      if (!config.palette) config.palette = pico.colors;
      super(config);
      (globalThis as any)[ENGINE_REF] = this;
    }
  }
  return { ...actual, default: InstrumentedEngine };
});

import App from '../App';

import type VPixEngine from '../../core/engine';

const getEngine = () => (globalThis as any)[ENGINE_REF] as VPixEngine;

const focusContainer = (ui: ReturnType<typeof render>) => {
  const container = ui.container.querySelector('.vpix-container') as HTMLElement | null;
  expect(container).toBeTruthy();
  container!.focus();
};

describe('App keyboard flows', () => {
  beforeEach(() => {
    (globalThis as any)[ENGINE_REF] = undefined;
    Object.assign(navigator, { clipboard: { writeText: () => Promise.resolve() } });
  });

  it('[count] gc selects color (11gc selects 11th swatch in pico-8)', async () => {
    const ui = render(<App />);
    focusContainer(ui);
    await userEvent.keyboard('1');
    await userEvent.keyboard('1');
    await userEvent.keyboard('g');
    await userEvent.keyboard('c');
    const engine = getEngine();
    expect(engine).toBeTruthy();
    expect(engine.currentColorIndex).toBe(10);
  });

  it('Tab toggles axis and StatusBar updates', async () => {
    const ui = render(<App />);
    focusContainer(ui);
    const axisCell = () => ui.container.querySelector('.axis-symbol');
    expect(axisCell()?.textContent).toBe('-');
    await userEvent.keyboard('{Tab}');
    expect(axisCell()?.textContent).toBe('|');
    await userEvent.keyboard('{Tab}');
    expect(axisCell()?.textContent).toBe('-');
  });

  it('word motions move cursor across runs horizontally and vertically', async () => {
    const ui = render(<App />);
    focusContainer(ui);
    const engine = getEngine();
    expect(engine).toBeTruthy();

    await userEvent.keyboard(' ');
    await userEvent.keyboard('l');
    await userEvent.keyboard(' ');
    await userEvent.keyboard('l');
    await userEvent.keyboard(' ');
    await userEvent.keyboard('ll');
    await userEvent.keyboard(' ');
    await userEvent.keyboard('l');
    await userEvent.keyboard(' ');
    await userEvent.keyboard('0');
    expect(engine.cursor).toEqual({ x: 0, y: 0 });

    await userEvent.keyboard('w');
    expect(engine.cursor).toEqual({ x: 3, y: 0 });
    await userEvent.keyboard('w');
    expect(engine.cursor).toEqual({ x: 4, y: 0 });
    await userEvent.keyboard('b');
    expect(engine.cursor).toEqual({ x: 3, y: 0 });
    await userEvent.keyboard('e');
    expect(engine.cursor).toEqual({ x: 3, y: 0 });
    await userEvent.keyboard('G');
    expect(engine.cursor).toEqual({ x: engine.width - 1, y: 0 });
    await userEvent.keyboard('ge');
    expect(engine.cursor).toEqual({ x: 5, y: 0 });

    await userEvent.keyboard('gg{Tab}');
    await userEvent.keyboard(' ');
    await userEvent.keyboard('j');
    await userEvent.keyboard(' ');
    await userEvent.keyboard('j');
    await userEvent.keyboard('j');
    await userEvent.keyboard(' ');
    await userEvent.keyboard('j');
    await userEvent.keyboard(' ');
    await userEvent.keyboard('gg');

    await userEvent.keyboard('w');
    expect(engine.cursor).toEqual({ x: 0, y: 1 });
    await userEvent.keyboard('w');
    expect(engine.cursor).toEqual({ x: 0, y: 2 });
    await userEvent.keyboard('b');
    expect(engine.cursor).toEqual({ x: 0, y: 1 });
    await userEvent.keyboard('e');
    expect(engine.cursor).toEqual({ x: 0, y: 1 });
    await userEvent.keyboard('G');
    expect(engine.cursor).toEqual({ x: 0, y: engine.height - 1 });
    await userEvent.keyboard('ge');
    expect(engine.cursor).toEqual({ x: 0, y: 4 });
  });

  it('dw, D and cw operate with motions and repeat via dot', async () => {
    const ui = render(<App />);
    focusContainer(ui);
    const engine = getEngine();

    await userEvent.keyboard(' ');
    await userEvent.keyboard('l ');
    await userEvent.keyboard('ll ');
    await userEvent.keyboard('l ');
    await userEvent.keyboard('0');

    await userEvent.keyboard('dw');
    expect(engine.grid[0][0]).toBeNull();
    expect(engine.grid[0][1]).toBeNull();
    expect(engine.grid[0][2]).toBeNull();
    expect(engine.grid[0][4]).not.toBeNull();

    await userEvent.keyboard('u');
    expect(engine.grid[0][0]).not.toBeNull();
    await userEvent.keyboard('{Control>}r{/Control}');
    expect(engine.grid[0][0]).toBeNull();

    await userEvent.keyboard('gg');
    await userEvent.keyboard('D');
    expect(engine.grid[0].every((cell) => cell == null)).toBe(true);

    await userEvent.keyboard(' ');
    await userEvent.keyboard('l ');
    await userEvent.keyboard('0cw');
    expect(engine.mode).toBe('normal');
    expect(engine.grid[0][0]).toBeNull();
  });

  it('dot repeats deletions', async () => {
    const ui = render(<App />);
    focusContainer(ui);
    const engine = getEngine();

    await userEvent.keyboard(' ');
    await userEvent.keyboard('l');
    await userEvent.keyboard(' ');
    await userEvent.keyboard('l');
    await userEvent.keyboard(' ');
    await userEvent.keyboard('ll');
    await userEvent.keyboard(' ');
    await userEvent.keyboard('l');
    await userEvent.keyboard(' ');
    await userEvent.keyboard('0dw');
    await userEvent.keyboard('w');
    await userEvent.keyboard('.');
    expect(engine.grid[0].slice(0, 6)).toEqual([null, null, null, null, null, null]);
  });
});
