export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function rotateMatrixCW(matrix: Array<Array<number | null>>): Array<Array<number | null>> {
  const height = matrix.length;
  const width = matrix.reduce((max, row) => Math.max(max, row.length), 0);
  if (height === 0 || width === 0) return [];
  return Array.from({ length: width }, (_, y) =>
    Array.from({ length: height }, (_, x) => matrix[height - 1 - x]?.[y] ?? null),
  );
}

export function rotateMatrixCCW(matrix: Array<Array<number | null>>): Array<Array<number | null>> {
  const height = matrix.length;
  const width = matrix.reduce((max, row) => Math.max(max, row.length), 0);
  if (height === 0 || width === 0) return [];
  return Array.from({ length: width }, (_, y) =>
    Array.from({ length: height }, (_, x) => matrix[x]?.[width - 1 - y] ?? null),
  );
}

