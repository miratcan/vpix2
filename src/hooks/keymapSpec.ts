import { KEYBINDINGS, type BindingCondition, type BindingScope, type KeyBinding } from '../../core/keybindings';
import { KeymapBuilder, type Keymap } from '../../core/services/keymap-builder';

const EXTRA_BINDINGS: Array<{ scope: BindingScope; key: string; command: string }> = [
  { scope: 'global', key: 'Shift+|', command: 'view.toggle-crosshair' }, // Turkish Q keyboard alias
  { scope: 'visual', key: 'x', command: 'selection.delete' },
];

const PREFIX_MAP: Partial<Record<BindingCondition, string[]>> = {
  'prefix:g': ['g'],
  'prefix:any': ['g'],
};

const RANGE_PATTERN = /^([a-z0-9])-([a-z0-9])$/i;

function expandSetExpression(expr: string): string[] {
  const rangeMatch = expr.match(RANGE_PATTERN);
  if (rangeMatch) {
    const start = rangeMatch[1].charCodeAt(0);
    const end = rangeMatch[2].charCodeAt(0);
    const keys: string[] = [];
    for (let code = start; code <= end; code += 1) {
      keys.push(String.fromCharCode(code));
    }
    return keys;
  }
  return expr.split('');
}

function expandKeyPattern(key: string): string[] {
  if (/^\[[^\]]+\]$/.test(key)) {
    const expr = key.slice(1, -1);
    return expandSetExpression(expr);
  }
  if (key === '__general__') return [];
  return [key];
}

function applyBinding(builder: KeymapBuilder, binding: KeyBinding, key: string, prefix: string | null) {
  const baseKey = key === 'Space' ? ' ' : key;
  if (prefix) {
    builder.bind(binding.scope, `${prefix}+${baseKey}`, binding.command);
  } else {
    builder.bind(binding.scope, baseKey, binding.command);
  }
}

function prefixesForCondition(condition?: BindingCondition): Array<string | null> {
  if (!condition || condition === 'no-prefix' || condition === 'always') return [null];
  const prefixes = PREFIX_MAP[condition];
  if (!prefixes) return [];
  return prefixes;
}

export function buildKeymapFromSpec(bindings: KeyBinding[] = KEYBINDINGS): Keymap {
  const builder = new KeymapBuilder();

  bindings.forEach((binding) => {
    const keys = expandKeyPattern(binding.key);
    if (keys.length === 0) return;
    const prefixes = prefixesForCondition(binding.when);
    if (prefixes.length === 0) return;

    prefixes.forEach((prefix) => {
      keys.forEach((key) => applyBinding(builder, binding, key, prefix));
    });
  });

  EXTRA_BINDINGS.forEach(({ scope, key, command }) => {
    builder.bind(scope, key, command);
  });

  return builder.build();
}
