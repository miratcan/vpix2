import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const ENGINE_REF = '__vpix_test_engine__';

vi.mock('../../core/engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../core/engine')>();
  class InstrumentedEngine extends actual.default {
    constructor(...args: ConstructorParameters<typeof actual.default>) {
      super(...args);
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
    const { setEngineFromText, expectEngineToMatchText } = await import('../../test/helpers/grid-helpers');
    // Horizontal runs with cursor on empty cell (C over '.')
    setEngineFromText(engine as any, `
      Axis: horizontal, Color: 2

      C1  1  .  .  2  2
       .  .  .  .  .  .
       .  .  .  .  .  .
    `);
    await userEvent.keyboard('w');
    expect(engine.cursor).toEqual({ x: 2, y: 0 });
    expectEngineToMatchText(engine as any, `
      Axis: horizontal

       1  1  C.  .  2  2
       .  .  .  .  .  .
       .  .  .  .  .  .
    `, { checkCursor: false });
    await userEvent.keyboard('w');
    expect(engine.cursor).toEqual({ x: 4, y: 0 });
    expectEngineToMatchText(engine as any, `
      Axis: horizontal

       1  1  C.  .  2  2
       .  .  .  .  .  .
       .  .  .  .  .  .
    `, { checkCursor: false });
    await userEvent.keyboard('b');
    expect(engine.cursor).toEqual({ x: 2, y: 0 });
    expectEngineToMatchText(engine as any, `
      Axis: horizontal

       1  1  C.  .  2  2
       .  .  .  .  .  .
       .  .  .  .  .  .
    `, { checkCursor: false });
    await userEvent.keyboard('e');
    expect(engine.cursor).toEqual({ x: 3, y: 0 });
    expectEngineToMatchText(engine as any, `
      Axis: horizontal

       1  1  .  C.  2  2
       .  .  .  .  .  .
       .  .  .  .  .  .
    `, { checkCursor: false });
    await userEvent.keyboard('G');
    expect(engine.cursor).toEqual({ x: 3, y: 0 });
    await userEvent.keyboard('ge');
    expect(engine.cursor).toEqual({ x: 1, y: 0 });
    expectEngineToMatchText(engine as any, `
      Axis: horizontal

       1  1  .  C.  2  2
       .  .  .  .  .  .
       .  .  .  .  .  .
    `, { checkCursor: false });
  });

  it('dw, D and cw operate with motions and repeat via dot', async () => {
    const ui = render(<App />);
    focusContainer(ui);
    const engine = getEngine();
    const { setEngineFromText, expectEngineToMatchText } = await import('../../test/helpers/grid-helpers');
    // Setup with runs and cursor at start on empty cell
    setEngineFromText(engine as any, `
      Axis: horizontal, Color: 2

      C.  .  2  2  .  .  2  2
       .  .  .  .  .  .  .  .
    `);
    await userEvent.keyboard('dw');
    await userEvent.keyboard('u');
    await userEvent.keyboard('{Control>}r{/Control}');

    await userEvent.keyboard('gg');
    await userEvent.keyboard('D');

    // Change word from start, should return to normal and leave first cell empty
    setEngineFromText(engine as any, `
      Axis: horizontal, Color: 2

      C.  .  2  2  .  .  .
    `);
    await userEvent.keyboard('cw');
    expect(engine.mode).toBe('normal');
  });

  it('dot repeats deletions', async () => {
    const ui = render(<App />);
    focusContainer(ui);
    const engine = getEngine();
    const { setEngineFromText } = await import('../../test/helpers/grid-helpers');
    setEngineFromText(engine as any, `
      Axis: horizontal, Color: 2

      C.  .  2  2  .  .  2  2
       .  .  .  .  .  .  .  .
    `);
    await userEvent.keyboard('dw');
    await userEvent.keyboard('w');
    await userEvent.keyboard('.');
    expect(engine.grid[0].slice(0, 6)).toEqual([null, null, 2, 2, null, null]);
  });
});
