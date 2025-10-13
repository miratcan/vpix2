import './KeyHint.css';

type KeyHintProps = {
  prefix: string | null;
  count: number | null;
  visible: boolean;
  mode?: string;
};

type HintGroup = {
  key: string;
  description: string;
};

type HintCategory = {
  category: string;
  hints: HintGroup[];
};

const PREFIX_HINTS: Record<string, HintGroup[]> = {
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

const NORMAL_MODE_HINTS: HintCategory[] = [
  {
    category: 'Movement',
    hints: [
      { key: 'h/j/k/l', description: 'move cursor' },
      { key: 'w/b/e', description: 'word navigation' },
      { key: '0/^/$', description: 'line begin/first/end' },
      { key: 'gg/G', description: 'canvas begin/end' },
    ],
  },
  {
    category: 'Paint',
    hints: [
      { key: 'Space', description: 'toggle pixel' },
      { key: 'x', description: 'erase pixel' },
      { key: 'i', description: 'pick color (eyedropper)' },
    ],
  },
  {
    category: 'Clipboard',
    hints: [
      { key: 'p', description: 'paste' },
    ],
  },
  {
    category: 'Mode',
    hints: [
      { key: 'v', description: 'visual mode' },
      { key: ':', description: 'command mode' },
    ],
  },
  {
    category: 'History',
    hints: [
      { key: 'u', description: 'undo' },
      { key: '.', description: 'repeat last action' },
    ],
  },
  {
    category: 'View',
    hints: [
      { key: '|', description: 'toggle crosshair' },
      { key: 'Tab', description: 'toggle axis' },
      { key: '+/-', description: 'zoom in/out' },
    ],
  },
  {
    category: 'Palette',
    hints: [
      { key: 'gt/gT', description: 'cycle colors' },
      { key: '[count]gc', description: 'go to color (e.g., 11gc)' },
      { key: 'Ctrl+^', description: 'swap last color' },
    ],
  },
  {
    category: 'Page Scroll',
    hints: [
      { key: 'Ctrl+d/u', description: 'page down/up' },
      { key: 'Ctrl+f/b', description: 'page forward/back' },
    ],
  },
  {
    category: 'Document',
    hints: [
      { key: 'S', description: 'save to localStorage' },
      { key: 'L', description: 'load from localStorage' },
    ],
  },
];

const VISUAL_MODE_HINTS: HintCategory[] = [
  {
    category: 'Movement',
    hints: [
      { key: 'h/j/k/l', description: 'expand selection' },
      { key: 'w/b/e', description: 'word navigation' },
    ],
  },
  {
    category: 'Selection',
    hints: [
      { key: 'y', description: 'yank (copy)' },
      { key: 'd', description: 'delete' },
      { key: 'p', description: 'paste' },
      { key: 'P', description: 'paste transparent' },
      { key: 'Esc', description: 'exit visual mode' },
    ],
  },
  {
    category: 'Transform',
    hints: [
      { key: '[', description: 'rotate counter-clockwise' },
      { key: ']', description: 'rotate clockwise' },
      { key: 'M', description: 'move to cursor' },
    ],
  },
  {
    category: 'Draw',
    hints: [
      { key: 'F', description: 'fill selection' },
      { key: 'R', description: 'stroke rectangle' },
      { key: 'C', description: 'stroke circle' },
      { key: 'O', description: 'fill circle' },
      { key: 'L', description: 'draw line' },
      { key: 'f', description: 'flood fill' },
    ],
  },
];

export default function KeyHint({ prefix, count, visible, mode = 'normal' }: KeyHintProps) {
  if (!visible) {
    return null;
  }

  // Show prefix-specific hints if prefix is active
  if (prefix && PREFIX_HINTS[prefix]) {
    const hints = PREFIX_HINTS[prefix];
    const categoryName = getCategoryName(prefix);

    return (
      <div className="key-hint-sidebar">
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
    );
  }

  // Show all available commands for current mode
  const categories = mode === 'visual' ? VISUAL_MODE_HINTS : NORMAL_MODE_HINTS;

  return (
    <div className="key-hint-sidebar">
      <div className="key-hint-header">
        <span className="key-hint-prefix">{mode === 'visual' ? 'VISUAL' : 'NORMAL'}</span>
        <span className="key-hint-category">Commands</span>
      </div>
      <div className="key-hint-sections">
        {categories.map((cat) => (
          <div key={cat.category} className="key-hint-category-section">
            <div className="key-hint-category-title">{cat.category}</div>
            <div className="key-hint-list">
              {cat.hints.map((hint) => (
                <div key={hint.key} className="key-hint-item">
                  <span className="key-hint-key">{hint.key}</span>
                  <span className="key-hint-desc">{hint.description}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
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
