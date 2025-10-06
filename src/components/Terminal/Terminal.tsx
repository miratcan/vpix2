import { useEffect, useRef } from 'react';
import './Terminal.css';

type Props = {
  lines: string[];
  cmdMode: boolean;
  cmdText: string;
  onChangeText: (t: string) => void;
  onSubmit: () => void;
  onTabComplete?: () => void;
};

export default function Terminal({ lines, cmdMode, cmdText, onChangeText, onSubmit, onTabComplete }: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  useEffect(() => {
    if (cmdMode) setTimeout(() => inputRef.current?.focus(), 0);
  }, [cmdMode]);

  return (
    <div className="terminal">
      <div className="term-scroll" ref={scrollerRef}>
        {lines.map((l, i) => (
          <div key={i} className="term-line">{l}</div>
        ))}
      </div>
      <div className="term-input-row">
        <span className="prompt">{cmdMode ? ':' : '>'}</span>
        <input
          ref={inputRef}
          className="term-input"
          value={cmdText}
          onChange={(e) => onChangeText(e.target.value)}
          onKeyDown={(e) => {
            // prevent bubbling to parent key handler so typing isn't blocked
            e.stopPropagation();
            if (e.key === 'Enter') { e.preventDefault(); onSubmit(); }
            else if (e.key === 'Tab') { e.preventDefault(); onTabComplete?.(); }
          }}
          placeholder={cmdMode ? 'command…' : ''}
        />
      </div>
    </div>
  );
}
