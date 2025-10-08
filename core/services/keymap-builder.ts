import type { CommandDefinition, KeyBinding } from '../commands/common';

export function buildKeymapTree(commands: readonly CommandDefinition[]) {
  const keymapTree: Record<string, any> = {};

  for (const command of commands) {
    if (!command.keybindings) continue;

    for (const binding of command.keybindings) {
      const mode = binding.when || 'global';
      const keys = binding.key.split(' ');
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
          currentLevel[key] = command.id;
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
