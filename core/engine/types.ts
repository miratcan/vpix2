export const MODES = {
  NORMAL: 'normal',
  VISUAL: 'visual',
} as const;

export type Mode = typeof MODES[keyof typeof MODES];

export type Point = { x: number; y: number };
export type Rect = { x1: number; y1: number; x2: number; y2: number };

export type EngineCommandPayload = {
  id?: string;
  display?: string | null;
  lines?: string[];
  ok?: boolean;
};

export type EngineChangePayload = {
  revision?: number;
  cmd?: EngineCommandPayload;
};

export type Axis = 'horizontal' | 'vertical';

export type EngineSnapshot = {
  width: number;
  height: number;
  palette: string[];
  currentColorIndex: number;
  grid: Array<Array<number | null>>;
  axis?: Axis;
};

export type EngineLogKind = 'info' | 'error';

export type EngineLogEntry = {
  id: number;
  message: string;
  kind: EngineLogKind;
  createdAt: number;
};
