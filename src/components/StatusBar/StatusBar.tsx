import './StatusBar.css';
import type VPixEngine from '../../../core/engine';
import { InfoTable, InfoTableRow } from '../InfoTable';

type Props = { engine: VPixEngine; zoom: number; pan: { x: number; y: number } };

export default function StatusBar({ engine, zoom, pan }: Props) {
  return (
    <div className="status-bar" role="status">
      <InfoTable role="table">
        <InfoTableRow label="MODE" value={engine.mode} />
        <InfoTableRow
          label="AXIS"
          value={
            <span className="axis-symbol" aria-label="axis">
              {engine.axis === 'horizontal' ? '-' : '|'}
            </span>
          }
        />
        <InfoTableRow
          label="CURSOR"
          value={`(${engine.cursor.x},${engine.cursor.y})`}
        />
        <InfoTableRow
          label="COLOR"
          value={<span className="color-chip" style={{ background: engine.color }} />}
        />
        <InfoTableRow
          label="SIZE"
          value={`${engine.width}x${engine.height}`}
        />
        <InfoTableRow
          label="ZOOM"
          value={`${Math.round((zoom || 1) * 100)}%`}
        />
        <InfoTableRow
          label="PAN"
          value={`(${pan?.x ?? 0},${pan?.y ?? 0})`}
        />
        <InfoTableRow label="VERSION" value={__APP_VERSION__} />
      </InfoTable>
    </div>
  );
}
