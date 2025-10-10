import type { Command, Keymap } from '../commands/common';

export class KeymapBuilder {
  private readonly bindings = new Map<string, Command>();

  /**
   * Binds a key sequence to a command ID.
   * @param key The key sequence, e.g., 'Ctrl+S', 'j', 'G'.
   * @param command The ID of the command to execute.
   */
  bind(key: string, command: Command): this {
    // TODO: Key sequence normalization if needed.
    this.bindings.set(key, command);
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
    // This is a placeholder implementation. The actual implementation will need
    // to handle modifiers (Ctrl, Alt, Shift, Meta) and special keys correctly.
    const parts: string[] = [];
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (event.metaKey) parts.push('Meta');

    // Avoid adding modifiers as the main key
    const key = event.key;
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
      parts.push(key);
    }

    return parts.join('+');
  }
}
