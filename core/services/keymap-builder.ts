import type { Command } from '../commands/common';
import type { BindingScope } from '../keybindings';

export type Keymap = Map<BindingScope, Map<string, Command>>;

export class KeymapBuilder {
  private readonly bindings = new Map<BindingScope, Map<string, Command>>();

  /**
   * Binds a key sequence to a command ID within a specific scope.
   * @param scope The scope of the binding (e.g., 'global', 'normal', 'visual').
   * @param key The key sequence, e.g., 'Ctrl+S', 'j', 'G'.
   * @param command The ID of the command to execute.
   */
  bind(scope: BindingScope, key: string, command: Command): this {
    if (!this.bindings.has(scope)) {
      this.bindings.set(scope, new Map<string, Command>());
    }
    const normalized = KeymapBuilder.normalizeKeySequence(key);
    this.bindings.get(scope)?.set(normalized, command);
    return this;
  }

  /**
   * Builds the final, immutable keymap.
   */
  build(): Keymap {
    return new Map(this.bindings);
  }

  /**
   * Parses a keyboard event into a canonical key sequence string.
   * @param event The keyboard event.
   * @returns A string representation of the key, e.g., 'Ctrl+Shift+A', 'Enter'.
   */
  static parseEvent(event: KeyboardEvent): string {
    const parts: string[] = [];
    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.metaKey) parts.push('meta');
    if (event.shiftKey) parts.push('shift');

    let key = event.key;
    if (key === ' ') key = 'space';
    else if (key.length === 1) key = key.toLowerCase();
    else key = key.toLowerCase();

    if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
      parts.push(key);
    }

    return parts.join('+');
  }

  private static normalizeKeySequence(sequence: string): string {
    return sequence
      .split('+')
      .map((part) => {
        const trimmed = part.trim();
        if (!trimmed && part === ' ') return 'space';
        if (!trimmed) return '';
        const lower = trimmed.toLowerCase();
        if (lower === 'space') return 'space';
        return lower;
      })
      .filter(Boolean)
      .join('+');
  }
}
