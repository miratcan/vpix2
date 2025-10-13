import './StatusBar.css';
import type VPixEngine from '../../../core/engine';

type Props = { engine: VPixEngine; zoom: number; pan: { x: number; y: number } };

export default function StatusBar({ engine, zoom, pan }: Props) {
  return (
    <div className="status-bar" role="status">
      <table className="info-table" role="table">
        <tbody>
          <tr>
            <th scope="row">MODE</th>
            <td>{engine.mode}</td>
          </tr>
          <tr>
            <th scope="row">AXIS</th>
            <td>
              <span className="axis-symbol" aria-label="axis">
                {engine.axis === 'horizontal' ? '-' : '|'}
              </span>
            </td>
          </tr>
          <tr>
            <th scope="row">CURSOR</th>
            <td>({engine.cursor.x},{engine.cursor.y})</td>
          </tr>
          <tr>
            <th scope="row">COLOR</th>
            <td><span className="color-chip" style={{ background: engine.color }} /></td>
          </tr>
          <tr>
            <th scope="row">SIZE</th>
            <td>{engine.width}x{engine.height}</td>
          </tr>
          <tr>
            <th scope="row">ZOOM</th>
            <td>{Math.round((zoom || 1) * 100)}%</td>
          </tr>
          <tr>
            <th scope="row">PAN</th>
            <td>({pan?.x ?? 0},{pan?.y ?? 0})</td>
          </tr>
          <tr>
            <th scope="row">VERSION</th>
            <td>{__APP_VERSION__}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
