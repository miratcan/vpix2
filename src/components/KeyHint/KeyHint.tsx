import { Fragment } from 'react';
import './KeyHint.css';
import type { Keymap } from '../../../core/services/keymap-builder';
import type { BindingScope } from '../../../core/keybindings';
import {
  InfoTable,
  InfoTableCategoryRow,
  InfoTableRow,
} from '../InfoTable';

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
    'paint.cut': 'cut (delete + yank)',
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
    'history.redo': 'redo',
    'edit.repeat-last': 'repeat last',
    'view.toggle-crosshair': 'toggle crosshair',
    'operator.set': 'set operator',
    'operator.delete.to-end': 'delete to end',
    'operator.change.to-end': 'change to end',
    'prefix.set': 'set prefix',
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
  if (commandId.startsWith('operator.')) return 'Operator';
  if (commandId.startsWith('prefix.')) return 'Prefix';
  if (commandId.startsWith('axis.')) return 'View';
  return 'Other';
}

type KeyBinding = {
  key: string;
  command: string;
  description: string;
  category?: string;
};

type CategoryBindings = {
  category: string;
  bindings: KeyBinding[];
  order: number;
};

type BindingOverride = {
  id: string;
  commands: string[];
  matchKeys?: string[];
  key: string;
  description: string;
  category: string;
};

const BINDING_OVERRIDES: BindingOverride[] = [
  {
    id: 'group.cursor-nav',
    commands: ['cursor.move-left', 'cursor.move-down', 'cursor.move-up', 'cursor.move-right'],
    matchKeys: ['h', 'j', 'k', 'l'],
    key: 'hjkl',
    description: 'move cursor',
    category: 'Movement',
  },
];

const CATEGORY_ORDER: Record<string, number> = {
  Motion: 0,
  Movement: 1,
  Operator: 2,
  Selection: 3,
  Paint: 4,
  Clipboard: 5,
  Palette: 6,
  Mode: 7,
  History: 8,
  Edit: 9,
  View: 10,
  Prefix: 11,
  Other: 12,
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
  const grouped = new Map<string, { order: number; bindings: KeyBinding[] }>();

  bindings.forEach((binding) => {
    const category = binding.category ?? categorizeCommand(binding.command);
    const order = CATEGORY_ORDER[category] ?? CATEGORY_ORDER.Other;
    if (!grouped.has(category)) {
      grouped.set(category, { order, bindings: [] });
    }
    grouped.get(category)!.bindings.push(binding);
  });

  const categories: CategoryBindings[] = [];
  grouped.forEach(({ bindings: catBindings, order }, category) => {
    categories.push({ category, bindings: catBindings, order });
  });

  return categories.sort((a, b) => a.order - b.order || a.category.localeCompare(b.category));
}

function applyOverrides(bindings: KeyBinding[]): KeyBinding[] {
  const remaining: KeyBinding[] = [];
  const collected = new Map<string, { override: BindingOverride; bindings: KeyBinding[] }>();

  bindings.forEach((binding) => {
    const match = BINDING_OVERRIDES.find((override) => {
      if (!override.commands.includes(binding.command)) return false;
      if (override.matchKeys && !override.matchKeys.includes(binding.key.toLowerCase())) return false;
      return true;
    });

    if (match) {
      const entry = collected.get(match.id) ?? { override: match, bindings: [] };
      entry.bindings.push(binding);
      collected.set(match.id, entry);
    } else {
      remaining.push(binding);
    }
  });

  collected.forEach(({ override, bindings: matched }) => {
    if (matched.length === override.commands.length) {
      remaining.push({
        key: override.key,
        command: override.id,
        description: override.description,
        category: override.category,
      });
    } else {
      remaining.push(...matched);
    }
  });

  return remaining;
}

export default function KeyHint({ prefix, count, visible, mode = 'normal', keymap }: KeyHintProps) {
  if (!visible) {
    return null;
  }

  // Show all available commands for current mode
  const scope = mode as BindingScope;
  const globalScope = 'global' as BindingScope;

  // Get bindings from both mode-specific and global scopes
  const modeBindings = extractBindingsFromScope(keymap, scope);
  const globalBindings = extractBindingsFromScope(keymap, globalScope);
  const allBindings = [...modeBindings, ...globalBindings].filter(
    (binding) => binding.command !== 'prefix.clear' && binding.command !== 'noop',
  );

  const mergedBindings = applyOverrides(allBindings);

  // Group by category
  const categories = groupBindingsByCategory(mergedBindings);

  return (
    <div className="key-hint-sidebar">
      <InfoTable>
        {categories.map((cat) => (
          <Fragment key={cat.category}>
            <InfoTableCategoryRow>{cat.category}</InfoTableCategoryRow>
            {cat.bindings.map((binding) => (
              <InfoTableRow
                key={`${cat.category}-${binding.key}`}
                label={binding.key}
                value={binding.description}
              />
            ))}
          </Fragment>
        ))}
      </InfoTable>
    </div>
  );
}
