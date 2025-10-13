import './KeyHint.css';
import type { Keymap } from '../../../core/services/keymap-builder';
import type { BindingScope } from '../../../core/keybindings';

type KeyHintProps = {
  prefix: string | null;
  count: number | null;
  visible: boolean;
  mode?: string;
  keymap: Keymap;
};

// Helper to get readable description from command ID
function getCommandDescription(commandId: string): string {
  const descriptions: Record<string, string> = {
    'cursor.move-left': 'move cursor left',
    'cursor.move-right': 'move cursor right',
    'cursor.move-up': 'move cursor up',
    'cursor.move-down': 'move cursor down',
    'cursor.page-down': 'page down',
    'cursor.page-up': 'page up',
    'cursor.page-forward': 'page forward',
    'cursor.page-backward': 'page backward',
    'paint.erase': 'erase pixel',
    'paint.toggle': 'toggle pixel',
    'clipboard.paste': 'paste',
    'mode.visual': 'visual mode',
    'palette.pick-color': 'pick color',
    'selection.move-left': 'expand left',
    'selection.move-right': 'expand right',
    'selection.move-up': 'expand up',
    'selection.move-down': 'expand down',
    'selection.exit-visual': 'exit visual',
    'selection.yank': 'yank (copy)',
    'selection.delete': 'delete',
    'selection.paste': 'paste',
    'selection.paste-transparent': 'paste transparent',
    'selection.rotate-cw': 'rotate CW',
    'selection.rotate-ccw': 'rotate CCW',
    'selection.move-to-cursor': 'move to cursor',
    'selection.fill': 'fill',
    'selection.stroke-rect': 'stroke rect',
    'selection.stroke-circle': 'stroke circle',
    'selection.fill-circle': 'fill circle',
    'selection.draw-line': 'draw line',
    'selection.flood-fill': 'flood fill',
    'motion.canvas-begin': 'canvas begin',
    'motion.canvas-end': 'canvas end',
    'motion.word-next': 'word next',
    'motion.word-prev': 'word prev',
    'motion.word-end-next': 'word end next',
    'motion.word-end-prev': 'word end prev',
    'motion.line-begin': 'line begin',
    'motion.line-first-nonblank': 'first nonblank',
    'motion.line-end': 'line end',
    'palette.select-index': 'go to color',
    'palette.cycle-next': 'cycle next',
    'palette.cycle-previous': 'cycle prev',
    'palette.swap-last-color': 'swap last color',
    'history.undo': 'undo',
    'edit.repeat-last': 'repeat last',
    'view.toggle-crosshair': 'toggle crosshair',
    'axis.toggle': 'toggle axis',
  };
  return descriptions[commandId] || commandId;
}

// Helper to categorize commands
function categorizeCommand(commandId: string): string {
  if (commandId.startsWith('cursor.')) return 'Movement';
  if (commandId.startsWith('paint.')) return 'Paint';
  if (commandId.startsWith('clipboard.')) return 'Clipboard';
  if (commandId.startsWith('mode.')) return 'Mode';
  if (commandId.startsWith('selection.')) return 'Selection';
  if (commandId.startsWith('motion.')) return 'Motion';
  if (commandId.startsWith('palette.')) return 'Palette';
  if (commandId.startsWith('history.')) return 'History';
  if (commandId.startsWith('edit.')) return 'Edit';
  if (commandId.startsWith('view.')) return 'View';
  if (commandId.startsWith('axis.')) return 'View';
  return 'Other';
}

type KeyBinding = {
  key: string;
  command: string;
  description: string;
};

type CategoryBindings = {
  category: string;
  bindings: KeyBinding[];
};

// Helper to format key for display
function formatKeyForDisplay(key: string): string {
  // Special handling for shift + letter combinations: show as uppercase letter
  const shiftLetterMatch = key.match(/^shift\+([a-z])$/i);
  if (shiftLetterMatch) {
    return shiftLetterMatch[1].toUpperCase();
  }

  // Normalize the key for display
  return key
    .replace(/\+/g, '+')
    .replace(/arrowleft/gi, '←')
    .replace(/arrowright/gi, '→')
    .replace(/arrowup/gi, '↑')
    .replace(/arrowdown/gi, '↓')
    .replace(/space/gi, '␣')
    .replace(/escape/gi, 'Esc')
    .replace(/shift/gi, 'Shift')
    .replace(/ctrl/gi, 'Ctrl')
    .replace(/alt/gi, 'Alt')
    .replace(/meta/gi, 'Meta');
}

// Helper to extract bindings from keymap for a scope
function extractBindingsFromScope(keymap: Keymap, scope: BindingScope): KeyBinding[] {
  const scopeMap = keymap.get(scope);
  if (!scopeMap) return [];

  const bindings: KeyBinding[] = [];
  scopeMap.forEach((command, key) => {
    bindings.push({
      key: formatKeyForDisplay(key),
      command,
      description: getCommandDescription(command),
    });
  });

  return bindings;
}

// Helper to group bindings by category
function groupBindingsByCategory(bindings: KeyBinding[]): CategoryBindings[] {
  const grouped = new Map<string, KeyBinding[]>();

  bindings.forEach((binding) => {
    const category = categorizeCommand(binding.command);
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)!.push(binding);
  });

  const categories: CategoryBindings[] = [];
  grouped.forEach((bindings, category) => {
    categories.push({ category, bindings });
  });

  return categories;
}

export default function KeyHint({ prefix, count, visible, mode = 'normal', keymap }: KeyHintProps) {
  if (!visible) {
    return null;
  }

  // Show prefix-specific hints if prefix is active
  if (prefix) {
    const scopeToCheck = mode as BindingScope;
    const scopeMap = keymap.get(scopeToCheck);

    // Find all commands that start with this prefix
    const prefixBindings: KeyBinding[] = [];
    scopeMap?.forEach((command, key) => {
      if (key.startsWith(`${prefix}+`)) {
        const displayKey = key.substring(prefix.length + 1); // Remove "g+" prefix
        prefixBindings.push({
          key: formatKeyForDisplay(displayKey),
          command,
          description: getCommandDescription(command),
        });
      }
    });

    if (prefixBindings.length > 0) {
      return (
        <div className="key-hint-sidebar">
          <table className="key-hint-table">
            <thead>
              <tr>
                <th colSpan={2}>{count !== null ? `${count}${prefix}` : prefix}</th>
              </tr>
            </thead>
            <tbody>
              {prefixBindings.map((binding) => (
                <tr key={binding.key}>
                  <td className="key-hint-key">{binding.key}</td>
                  <td className="key-hint-desc">{binding.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }

  // Show all available commands for current mode
  const scope = mode as BindingScope;
  const globalScope = 'global' as BindingScope;

  // Get bindings from both mode-specific and global scopes
  const modeBindings = extractBindingsFromScope(keymap, scope);
  const globalBindings = extractBindingsFromScope(keymap, globalScope);
  const allBindings = [...modeBindings, ...globalBindings];

  // Group by category
  const categories = groupBindingsByCategory(allBindings);

  return (
    <div className="key-hint-sidebar">
      <table className="key-hint-table">
        <thead>
          <tr>
            <th colSpan={2}>{mode === 'visual' ? 'VISUAL' : 'NORMAL'}</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <>
              <tr key={cat.category} className="key-hint-category-row">
                <td colSpan={2}>{cat.category}</td>
              </tr>
              {cat.bindings.map((binding) => (
                <tr key={`${cat.category}-${binding.key}`}>
                  <td className="key-hint-key">{binding.key}</td>
                  <td className="key-hint-desc">{binding.description}</td>
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
