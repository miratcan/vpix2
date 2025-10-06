export type GridValue = number | null;

export type ToolOperation = { x: number; y: number; value: GridValue };

export type ReadCell = (x: number, y: number) => GridValue;

export type Rect = { x1: number; y1: number; x2: number; y2: number };

export type Bounds = Rect;

export type Point = { x: number; y: number };
