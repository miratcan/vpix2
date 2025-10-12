import { useEffect, useState } from 'react';
import './KeyHint.css';

type KeyHintProps = {
  prefix: string | null;
  count: number | null;
  visible: boolean;
};

type HintGroup = {
  key: string;
  description: string;
};

const HINT_MAP: Record<string, HintGroup[]> = {
  g: [
    { key: 'g', description: 'canvas begin' },
    { key: 'c', description: 'go to color (needs count: 11gc)' },
    { key: 't', description: 'palette next' },
    { key: 'T', description: 'palette prev' },
    { key: 'e', description: 'word end prev' },
  ],
  d: [
    { key: 'd', description: 'delete operator (pending)' },
  ],
  y: [
    { key: 'y', description: 'yank operator (pending)' },
  ],
  c: [
    { key: 'c', description: 'change operator (pending)' },
  ],
};

export default function KeyHint({ prefix, count, visible }: KeyHintProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!visible || !prefix) {
      setShow(false);
      return;
    }

    // Show immediately
    setShow(true);
  }, [prefix, visible]);

  if (!show || !prefix || !HINT_MAP[prefix]) {
    return null;
  }

  const hints = HINT_MAP[prefix];
  const categoryName = getCategoryName(prefix);

  return (
    <div className="key-hint-overlay">
      <div className="key-hint-panel">
        <div className="key-hint-header">
          <span className="key-hint-prefix">{count !== null ? `${count}${prefix}` : prefix}</span>
          <span className="key-hint-category">{categoryName}</span>
        </div>
        <div className="key-hint-list">
          {hints.map((hint) => (
            <div key={hint.key} className="key-hint-item">
              <span className="key-hint-key">{hint.key}</span>
              <span className="key-hint-desc">{hint.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getCategoryName(prefix: string): string {
  switch (prefix) {
    case 'g':
      return 'goto';
    case 'd':
      return 'delete operator';
    case 'y':
      return 'yank operator';
    case 'c':
      return 'change operator';
    default:
      return 'commands';
  }
}
