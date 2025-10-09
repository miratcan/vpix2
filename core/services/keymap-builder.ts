import type { CommandDefinition, KeyBinding } from '../commands/common';

/**
 * Extracts only the literal words from a pattern DSL string.
 * For example: "{count:number} gc" -> "gc"
 *              "cursor up" -> "cursor up"
 */
function extractLiterals(pattern: string): string {
  return pattern
    .split(/\s+/)
    .filter(token => !token.startsWith('{') || !token.endsWith('}'))
    .join(' ');
}

export function buildKeymapTree(commands: readonly CommandDefinition[]) {
  const keymapTree: Record<string, any> = {};

  for (const command of commands) {
    if (!command.keybindings) continue;

    for (const binding of command.keybindings) {
      const mode = binding.when || 'global';
      // Split by spaces first, then split multi-character strings into individual characters
      const keys = binding.key.split(' ').flatMap(part => {
        // If the part is a single character or a special key like Tab, keep it as is
        if (part.length === 1 || part === 'Tab' || part.startsWith('Control') || part.startsWith('Shift') || part.startsWith('Alt') || part.startsWith('Meta')) {
          return [part];
        }
        // Otherwise, split into individual characters (for chords like 'gc' → ['g', 'c'])
        return part.split('');
      });
      let currentLevel = keymapTree;

      // Create mode level if it doesn't exist
      if (!currentLevel[mode]) {
        currentLevel[mode] = {};
      }
      currentLevel = currentLevel[mode];

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];

        if (i === keys.length - 1) {
          // Last key in the sequence
          if (currentLevel[key] && typeof currentLevel[key] === 'object') {
            throw new Error(`Keybinding conflict: Key '${binding.key}' for command '${command.id}' conflicts with a chord leader.`);
          }
          if (currentLevel[key]) {
            throw new Error(`Keybinding conflict: Key '${binding.key}' in mode '${mode}' is already mapped. Cannot map to '${command.id}'.`);
          }
          // Store only the literal words from the pattern, not the parameter placeholders
          currentLevel[key] = extractLiterals(command.patterns[0].pattern);
        } else {
          // Chord leader
          if (!currentLevel[key]) {
            currentLevel[key] = {};
          }
          if (typeof currentLevel[key] !== 'object') {
            throw new Error(`Keybinding conflict: Key '${key}' is a chord leader but is already mapped to a command.`);
          }
          currentLevel = currentLevel[key];
        }
      }
    }
  }
  return keymapTree;
}
