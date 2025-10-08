import { useState, useEffect } from 'react';
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

  return (
    <div className="help-modal-overlay" onClick={handleClose}>
      <div className="help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="help-modal-header">
          <h2 className="help-modal-title">Welcome to vpix!</h2>
          <button className="help-modal-close" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="help-modal-body">
          <p>Keybindings documentation can now be found in <strong>docs/KEYS.md</strong></p>
          <p>This documentation is auto-generated from the command definitions.</p>
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