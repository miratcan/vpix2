import { useCallback, useMemo, useState } from 'react';

import { executeCommand, suggestCommands, type CommandServices } from '../../core/commands';
import { PaletteService } from '../../core/services/palette-service';

import type VPixEngine from '../../core/engine';

export type CommandConsoleOptions = {
  engine: VPixEngine;
  services?: CommandServices;
  paletteService?: PaletteService;
  onHelp?: () => void;
};

export function useCommandConsole({ engine, services, paletteService, onHelp }: CommandConsoleOptions) {
  const palettes = useMemo(() => paletteService ?? services?.palettes ?? new PaletteService(), [paletteService, services?.palettes]);
  const [cmdMode, setCmdMode] = useState(false);
  const [cmdText, setCmdText] = useState('');

  const submit = useCallback(async () => {
    const trimmed = cmdText.trim();
    if (!trimmed) {
      setCmdMode(false);
      setCmdText('');
      return;
    }

    // Handle help command specially
    if (trimmed === 'help') {
      setCmdMode(false);
      setCmdText('');
      if (onHelp) onHelp();
      return;
    }

    setCmdMode(false);
    setCmdText('');
    await executeCommand(engine, trimmed, services);
  }, [cmdText, engine, services, onHelp]);

  const handleTabComplete = useCallback(() => {
    const t = cmdText;
    const suggestions = suggestCommands(t);
    if (suggestions.length > 0) {
      const base = /\s$/.test(t) ? t : t.replace(/\S+$/, '');
      const prefix = base ? base : t.endsWith(' ') ? t : `${t} `;
      setCmdText(`${prefix}${suggestions[0]}`);
      return;
    }
    const lowers = t.trimStart().toLowerCase();
    const prefixes = ['palette use ', 'palette fetch '];
    const prefix = prefixes.find((pfx) => lowers.startsWith(pfx));
    if (prefix) {
      const term = t.slice(t.toLowerCase().indexOf(prefix) + prefix.length).trim();
      const matches = palettes.searchRegistry(term);
      if (matches.length > 0) {
        setCmdText(prefix + matches[0]);
      } else {
        palettes.searchRemote(term).then((slugs) => {
          if (slugs.length > 0) setCmdText(prefix + slugs[0]);
        }).catch(() => {});
      }
    }
  }, [cmdText, palettes]);

  const openCommand = useCallback(() => {
    setCmdMode(true);
    setCmdText('');
  }, []);

  const closeCommand = useCallback(() => {
    setCmdMode(false);
    setCmdText('');
  }, []);

  return {
    cmdMode,
    cmdText,
    setCmdText,
    submit,
    handleTabComplete,
    openCommand,
    closeCommand,
  } as const;
}
