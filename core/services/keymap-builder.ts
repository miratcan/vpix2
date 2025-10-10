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
    this.bindings.get(scope)?.set(key, command);
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
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.metaKey) parts.push('Meta');

    const key = event.key;
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
      parts.push(key);
    } else if (key === ' ') { // Special case for spacebar
      parts.push('Space');
    }

    return parts.join('+');
  }
}
