export const MODES = {
  NORMAL: 'normal',
  INSERT: 'insert',
  VISUAL: 'visual',
} as const;

export type Mode = typeof MODES[keyof typeof MODES];

export type Point = { x: number; y: number };
export type Rect = { x1: number; y1: number; x2: number; y2: number };

export type EngineChangePayload = { changed?: Rect[]; revision?: number };

export type EngineSnapshot = {
  width: number;
  height: number;
  palette: string[];
  currentColorIndex: number;
  grid: Array<Array<string | null>>;
}
