import { render, screen } from '@testing-library/react';
import assert from 'assert';
import { describe, it } from 'vitest';

import Grid from './Grid.tsx';

import type VPixEngine from '../../../core/engine';

describe('Grid component', () => {
  it('should render a grid of pixels', () => {
    const mockEngine = {
      width: 2,
      height: 2,
      cursor: { x: 0, y: 0 },
      grid: [
        ['#FF0000', '#00FF00'],
        ['#0000FF', null],
      ],
    } as unknown as VPixEngine;

    render(<Grid engine={mockEngine} />);

    const gridElement = screen.getByLabelText('pixel-grid');
    assert.ok(gridElement);

    const cells = gridElement.children;
    assert.equal(cells.length, 4);

    // Check cursor
    assert.ok(cells[0].classList.contains('cursor'));
    assert.ok(!cells[1].classList.contains('cursor'));

    // Check colors
    assert.equal(cells[0].style.backgroundColor, 'rgb(255, 0, 0)');
    assert.equal(cells[1].style.backgroundColor, 'rgb(0, 255, 0)');
    assert.equal(cells[2].style.backgroundColor, 'rgb(0, 0, 255)');
    assert.equal(cells[3].style.backgroundColor, 'transparent');
  });
});
