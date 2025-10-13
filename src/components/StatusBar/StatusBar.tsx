import './StatusBar.css';
import type VPixEngine from '../../../core/engine';

type Props = { engine: VPixEngine; zoom: number; pan: { x: number; y: number } };

export default function StatusBar({ engine, zoom, pan }: Props) {
  return (
    <div className="status-bar" role="status">
      <table className="info-table" role="table">
        <tbody>
          <tr>
            <th scope="row" className="info-table-key">MODE</th>
            <td className="info-table-value">{engine.mode}</td>
          </tr>
          <tr>
            <th scope="row" className="info-table-key">AXIS</th>
            <td className="info-table-value">
              <span className="axis-symbol" aria-label="axis">
                {engine.axis === 'horizontal' ? '-' : '|'}
              </span>
            </td>
          </tr>
          <tr>
            <th scope="row" className="info-table-key">CURSOR</th>
            <td className="info-table-value">({engine.cursor.x},{engine.cursor.y})</td>
          </tr>
          <tr>
            <th scope="row" className="info-table-key">COLOR</th>
            <td className="info-table-value"><span className="color-chip" style={{ background: engine.color }} /></td>
          </tr>
          <tr>
            <th scope="row" className="info-table-key">SIZE</th>
            <td className="info-table-value">{engine.width}x{engine.height}</td>
          </tr>
          <tr>
            <th scope="row" className="info-table-key">ZOOM</th>
            <td className="info-table-value">{Math.round((zoom || 1) * 100)}%</td>
          </tr>
          <tr>
            <th scope="row" className="info-table-key">PAN</th>
            <td className="info-table-value">({pan?.x ?? 0},{pan?.y ?? 0})</td>
          </tr>
          <tr>
            <th scope="row" className="info-table-key">VERSION</th>
            <td className="info-table-value">{__APP_VERSION__}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
