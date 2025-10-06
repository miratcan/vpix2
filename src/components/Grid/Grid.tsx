import './Grid.css';
import type VPixEngine from '../../../core/engine';

type Props = {
  engine: VPixEngine;
};

export default function Grid({ engine }: Props) {
  const { grid, cursor, width, height } = engine;
  const size = 16; // px per cell
  const style = {
    gridTemplateColumns: `repeat(${width}, ${size}px)`,
    gridTemplateRows: `repeat(${height}, ${size}px)`,
  };

  return (
    <div className="grid" style={style} aria-label="pixel-grid">
      {grid.map((row, y) =>
        row.map((cell, x) => {
          const isCursor = cursor.x === x && cursor.y === y;
          return (
            <div
              key={`${x}-${y}`}
              className={`cell${isCursor ? ' cursor' : ''}`}
              style={{ backgroundColor: cell ?? 'transparent' }}
            />
          );
        })
      )}
    </div>
  );
}
