import type VPixEngine from '../../core/engine';
import TestableEngine from '../../core/engine/testable';

export function setEngineFromText(engine: VPixEngine, text: string) {
  if (engine instanceof TestableEngine) {
    engine.setStateFromString(text);
    return;
  }
  const { grid, cursor, meta } = TestableEngine.parseState(text);
  if (meta.axis) engine.setAxis(meta.axis);
  if (typeof meta.colorIndex === 'number') engine.setColorIndex(meta.colorIndex);
  const h = Math.min(engine.height, grid.length);
  const w = Math.min(engine.width, grid[0]?.length ?? 0);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      (engine as any).gridState.writeCell(x, y, grid[y][x]);
    }
  }
  if (cursor) engine.cursor = cursor;
}

export function expectEngineToMatchText(
  engine: VPixEngine,
  text: string,
  options?: { checkCursor?: boolean },
) {
  const actualState = engine instanceof TestableEngine ? engine.getStateAsString() : TestableEngine.serializeState(engine);
  const expectedEngine = new TestableEngine({ width: engine.width, height: engine.height, palette: engine.palette });
  expectedEngine.setStateFromString(text);
  const expectedState = expectedEngine.getStateAsString();

  if (options?.checkCursor === false) {
    const normalize = (state: string) => state.replace(/C([\d.])/g, ' $1').replace(/C(?=\s|$)/g, ' ');
    if (normalize(actualState) !== normalize(expectedState)) {
      throw new Error(`Engine state mismatch (cursor ignored)\nActual:\n${actualState}\nExpected:\n${expectedState}`);
    }
    return;
  }

  if (actualState !== expectedState) {
    throw new Error(`Engine state mismatch\nActual:\n${actualState}\nExpected:\n${expectedState}`);
  }
}

export { TestableEngine };
