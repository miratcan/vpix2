import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';

import App from '../App';

describe('App keyboard flows', () => {
  beforeEach(() => {
    // jsdom doesn't implement clipboard; stub to avoid errors
    Object.assign(navigator, { clipboard: { writeText: () => Promise.resolve() } });
  });

  it('[count] c selects color (11c selects 11th swatch in pico-8)', async () => {
    const ui = render(<App />);
    const container = ui.container.querySelector('.vpix-container');
    container.focus();
    // press 1, 1, then c
    await userEvent.keyboard('11c');
    // pico-8 has 16 colors; expect 11th swatch active (1-indexed)
    const swatches = ui.container.querySelectorAll('.swatch');
    const active = ui.container.querySelector('.swatch.active');
    expect(swatches.length).toBeGreaterThan(11);
    expect(active).toBe(swatches[10]);
  });

  it('Tab toggles axis and StatusBar updates', async () => {
    const ui = render(<App />);
    const container = ui.container.querySelector('.vpix-container');
    container.focus();
    const axisCell = () => ui.container.querySelector('.axis-symbol');
    expect(axisCell().textContent).toBe('-');
    await userEvent.keyboard('{Tab}');
    expect(axisCell().textContent).toBe('|');
    await userEvent.keyboard('{Tab}');
    expect(axisCell().textContent).toBe('-');
  });
});
