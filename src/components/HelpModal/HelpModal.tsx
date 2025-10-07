import { useState, useEffect } from 'react';
import { describeCommands } from '../../../core/commands';
import './HelpModal.css';

type Props = {
  onClose: () => void;
  onDontShowAgain?: () => void;
};

export default function HelpModal({ onClose, onDontShowAgain }: Props) {
  const [dontShow, setDontShow] = useState(false);

  const handleClose = () => {
    if (dontShow && onDontShowAgain) {
      onDontShowAgain();
    }
    onClose();
  };

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (dontShow && onDontShowAgain) {
          onDontShowAgain();
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dontShow, onClose, onDontShowAgain]);

  const commands = describeCommands();

  // Group commands by category (prefix before first dot)
  const grouped = commands.reduce((acc, cmd) => {
    const category = cmd.id.split('.')[0];
    if (!acc[category]) acc[category] = [];
    acc[category].push(cmd);
    return acc;
  }, {} as Record<string, typeof commands>);

  const categoryNames: Record<string, string> = {
    canvas: 'Canvas',
    palette: 'Palette',
    paint: 'Paint',
    clipboard: 'Clipboard',
    selection: 'Selection',
    axis: 'Movement',
    cursor: 'Cursor',
    motion: 'Motion',
    mode: 'Mode',
    operator: 'Operators',
    history: 'History',
    share: 'Share',
    core: 'Core',
    prefix: 'Prefix',
    edit: 'Edit',
    document: 'Document',
  };

  return (
    <div className="help-modal-overlay" onClick={handleClose}>
      <div className="help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="help-modal-header">
          <h2 className="help-modal-title">vpix Commands</h2>
          <button className="help-modal-close" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="help-modal-body">
          {Object.entries(grouped).map(([category, cmds]) => (
            <div key={category} className="help-modal-section">
              <h3 className="help-modal-section-title">
                {categoryNames[category] || category}
              </h3>
              <div className="help-modal-table-wrapper">
                <table className="help-modal-table">
                  <thead>
                    <tr>
                      <th>Command</th>
                      <th>Summary</th>
                      <th>Keys</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cmds.map((cmd) => (
                      <tr key={cmd.id}>
                        <td>{cmd.name}</td>
                        <td>{cmd.summary}</td>
                        <td>
                          {cmd.keys.length ? (
                            cmd.keys.map((key, idx) => (
                              <span key={`${cmd.id}-key-${idx}`} className="help-modal-key-badge">
                                {key}
                              </span>
                            ))
                          ) : (
                            <span className="help-modal-no-keys">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        <div className="help-modal-footer">
          <a href="https://github.com/vpix/vpix2" target="_blank" rel="noreferrer">
            GitHub’da proje sayfası
          </a>
          <label className="help-modal-checkbox-label">
            <input
              type="checkbox"
              checked={dontShow}
              onChange={(e) => setDontShow(e.target.checked)}
            />
            Don't show on startup
          </label>
          <button className="help-modal-close" onClick={handleClose}>
            Close (ESC)
          </button>
        </div>
      </div>
    </div>
  );
}
