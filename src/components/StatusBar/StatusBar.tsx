import './StatusBar.css';
import type VPixEngine from '../../../core/engine';

type Props = { engine: VPixEngine; zoom: number; pan: { x: number; y: number } };

export default function StatusBar({ engine, zoom, pan }: Props) {
  return (
    <div className="status-bar" role="status">
      <table className="info-table" role="table">
        <tbody>
          <tr>
            <th scope="row" className="key">MODE</th>
            <td className="value">{engine.mode}</td>
          </tr>
          <tr>
            <th scope="row" className="key">AXIS</th>
            <td className="value">
              <span className="axis-symbol" aria-label="axis">
                {engine.axis === 'horizontal' ? '-' : '|'}
              </span>
            </td>
          </tr>
          <tr>
            <th scope="row" className="key">CURSOR</th>
            <td className="value">({engine.cursor.x},{engine.cursor.y})</td>
          </tr>
          <tr>
            <th scope="row" className="key">COLOR</th>
            <td className="value"><span className="color-chip" style={{ background: engine.color }} /></td>
          </tr>
          <tr>
            <th scope="row" className="key">SIZE</th>
            <td className="value">{engine.width}x{engine.height}</td>
          </tr>
          <tr>
            <th scope="row" className="key">ZOOM</th>
            <td className="value">{Math.round((zoom || 1) * 100)}%</td>
          </tr>
          <tr>
            <th scope="row" className="key">PAN</th>
            <td className="value">({pan?.x ?? 0},{pan?.y ?? 0})</td>
          </tr>
          <tr>
            <th scope="row" className="key">VERSION</th>
            <td className="value">{__APP_VERSION__}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
