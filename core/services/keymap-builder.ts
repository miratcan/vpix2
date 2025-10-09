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
          const commandPattern = extractLiterals(command.patterns[0].pattern);

          if (currentLevel[key] && typeof currentLevel[key] === 'object') {
            // This key is already a chord leader; store the command in __cmd property
            if (currentLevel[key].__cmd) {
              throw new Error(`Keybinding conflict: Key '${binding.key}' in mode '${mode}' is already mapped. Cannot map to '${command.id}'.`);
            }
            currentLevel[key].__cmd = commandPattern;
          } else if (currentLevel[key]) {
            // Already mapped to another command
            throw new Error(`Keybinding conflict: Key '${binding.key}' in mode '${mode}' is already mapped. Cannot map to '${command.id}'.`);
          } else {
            // New command binding
            currentLevel[key] = commandPattern;
          }
        } else {
          // Chord leader
          if (!currentLevel[key]) {
            currentLevel[key] = {};
          } else if (typeof currentLevel[key] === 'string') {
            // This key is already a command; convert it to an object with __cmd
            const existingCommand = currentLevel[key];
            currentLevel[key] = { __cmd: existingCommand };
          }
          currentLevel = currentLevel[key];
        }
      }
    }
  }
  return keymapTree;
}
