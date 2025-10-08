import { writeFileSync } from 'fs';
import { COMMAND_DEFINITIONS } from '../core/commands/index.ts';
import { buildKeymapTree } from '../core/services/keymap-builder.ts';

function generateDocs() {
  const keymapTree = buildKeymapTree(COMMAND_DEFINITIONS);
  const commandMap = new Map(COMMAND_DEFINITIONS.map(cmd => [cmd.id, cmd]));

  const lines = [];
  lines.push('# Keybindings');
  lines.push('');
  lines.push('_This file is auto-generated. Do not edit manually._');
  lines.push('');

  for (const mode in keymapTree) {
    lines.push(`## ${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode`);
    lines.push('');

    const modeMap = keymapTree[mode];
    for (const key in modeMap) {
      const commandId = modeMap[key];
      if (typeof commandId === 'string') {
        const command = commandMap.get(commandId);
        const description = command?.description || '';
        lines.push(`- **`${key}`**: andomIndex`commandId` - ${description}`);
      } else {
        for (const chordKey in commandId) {
          if (chordKey === '__is_chord_leader__') continue;
          const chordCommandId = commandId[chordKey];
          const command = commandMap.get(chordCommandId);
          const description = command?.description || '';
          lines.push(`- **`${key} ${chordKey}`**: andomIndex`chordCommandId` - ${description}`);
        }
      }
    }
    lines.push('');
  }

  writeFileSync('docs/KEYS.md', lines.join('\n'), 'utf-8');
  console.log('Successfully generated docs/KEYS.md');
}

generateDocs();
