import './StatusBar.css';
import type VPixEngine from '../../../core/engine';

type Props = { engine: VPixEngine; zoom: number; pan: { x: number; y: number } };

export default function StatusBar({ engine, zoom, pan }: Props) {
  return (
    <div className="status-bar" role="status">
      <table className="status-table" role="table">
        <tbody>
          <tr>
            <th scope="row">mode</th>
            <td>{engine.mode}</td>
          </tr>
          <tr>
            <th scope="row">axis</th>
            <td>
              <span className="axis-symbol" aria-label="axis">
                {engine.axis === 'horizontal' ? '-' : '|'}
              </span>
            </td>
          </tr>
          <tr>
            <th scope="row">cursor</th>
            <td>({engine.cursor.x},{engine.cursor.y})</td>
          </tr>
          <tr>
            <th scope="row">color</th>
            <td><span className="color-chip" style={{ background: engine.color }} /></td>
          </tr>
          <tr>
            <th scope="row">size</th>
            <td>{engine.width}x{engine.height}</td>
          </tr>
          <tr>
            <th scope="row">zoom</th>
            <td>{Math.round((zoom || 1) * 100)}%</td>
          </tr>
          <tr>
            <th scope="row">pan</th>
            <td>({pan?.x ?? 0},{pan?.y ?? 0})</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
