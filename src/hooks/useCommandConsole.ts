import { useCallback, useEffect, useMemo, useState } from 'react';

import { executeCommand, suggestCommands, type CommandServices } from '../../core/commands';
import { PaletteService } from '../../core/services/palette-service';

import type VPixEngine from '../../core/engine';

export type CommandConsoleOptions = {
  engine: VPixEngine;
  services?: CommandServices;
  paletteService?: PaletteService;
};

export function useCommandConsole({ engine, services, paletteService }: CommandConsoleOptions) {
  const palettes = useMemo(() => paletteService ?? services?.palettes ?? new PaletteService(), [paletteService, services?.palettes]);
  const [showTerminal, setShowTerminal] = useState(false);
  const [cmdMode, setCmdMode] = useState(false);
  const [cmdText, setCmdText] = useState('');
  const [termLines, setTermLines] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(null), 2000);
    return () => clearTimeout(id);
  }, [message]);

  const appendLines = useCallback((lines: string[]) => {
    if (!lines.length) return;
    setShowTerminal(true);
    setTermLines((prev) => [...prev, ...lines]);
  }, []);

  const submit = useCallback(async () => {
    const trimmed = cmdText.trim();
    if (!trimmed) {
      setCmdMode(false);
      setCmdText('');
      return;
    }
    if (trimmed === 'exit') {
      setCmdMode(false);
      setShowTerminal(false);
      setCmdText('');
      return;
    }
    if (trimmed === 'clear') {
      setTermLines([]);
      setCmdMode(false);
      setCmdText('');
      return;
    }
    setCmdMode(false);
    setCmdText('');
    const res = await executeCommand(engine, trimmed, services);
    const extraLines = res.meta?.lines ?? [];
    if (res.meta?.silent) {
      if (extraLines.length) appendLines(extraLines);
      if (res.meta?.closeTerminal) setShowTerminal(false);
      setMessage(null);
      return;
    }
    const lines = [`:${trimmed}`];
    if (res.msg) lines.push(res.msg);
    if (extraLines.length) lines.push(...extraLines);
    appendLines(lines);
    if (res.msg) setMessage(res.msg);
    else setMessage(null);
    if (res.meta?.closeTerminal) setShowTerminal(false);
  }, [appendLines, cmdText, engine, services, setShowTerminal]);

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
    setShowTerminal(true);
    setCmdMode(true);
    setCmdText('');
  }, []);

  const closeCommand = useCallback(() => {
    setCmdMode(false);
    setCmdText('');
  }, []);

  const toggleTerminal = useCallback(() => {
    setShowTerminal((v) => !v);
  }, []);

  return {
    showTerminal,
    setShowTerminal,
    cmdMode,
    cmdText,
    setCmdText,
    termLines,
    appendLines,
    submit,
    handleTabComplete,
    openCommand,
    closeCommand,
    toggleTerminal,
    message,
  } as const;
}
