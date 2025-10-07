import { useEffect, useState, useRef, useCallback } from 'react';
import type VPixEngine from '../../../core/engine';
import './CommandFeed.css';

// Child component for a single line, managing its own lifecycle
function CommandLine({ text, onDone, className }: { text: string; onDone: () => void; className?: string }) {
  const [opacity, setOpacity] = useState(1);

  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const fadeDelay = 4000;
    const fadeDuration = 3000;

    const fadeTimeout = setTimeout(() => {
      const startTime = Date.now();
      const fade = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / fadeDuration, 1);
        setOpacity(1 - progress);

        if (progress < 1) {
          requestAnimationFrame(fade);
        } else {
          onDoneRef.current();
        }
      };
      requestAnimationFrame(fade);
    }, fadeDelay);

    return () => clearTimeout(fadeTimeout);
  }, []);

  return (
    <div className={`feed-line ${className || ''}`} style={{ opacity }}>
      {text}
    </div>
  );
}

// Parent component that manages the list of lines
export default function CommandFeed({ items, engine }: { items: Array<{ id: string; display: string }>; engine: VPixEngine }) {
  const [lines, setLines] = useState<Array<{ id: string; display: string }>>([]);
  const removedIds = useRef(new Set<string>());
  const tipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Effect to add new items from props.
  useEffect(() => {
    setLines(prevLines => {
      const prevLineIds = new Set(prevLines.map(l => l.id));
      const newItems = items.filter(item =>
        !prevLineIds.has(item.id) && !removedIds.current.has(item.id)
      );

      if (newItems.length > 0) {
        // Don't remove tips - just add new items
        return [...prevLines, ...newItems];
      }
      return prevLines;
    });
  }, [items]);

  // Effect to show tip 3 seconds after last feed line
  useEffect(() => {
    // Clear any existing timeout
    if (tipTimeoutRef.current) {
      clearTimeout(tipTimeoutRef.current);
    }

    // Set new timeout - triggers 3 seconds after items change
    tipTimeoutRef.current = setTimeout(() => {
      const randomTip = engine.getRandomTip();
      if (!randomTip) return;

      const tipId = `tip-${Date.now()}`;

      setLines(prev => {
        // Only add tip if there are no existing tips
        const hasTip = prev.some(l => l.id.startsWith('tip-'));
        if (hasTip) return prev;
        return [...prev, { id: tipId, display: randomTip }];
      });
    }, 3000);

    return () => {
      if (tipTimeoutRef.current) {
        clearTimeout(tipTimeoutRef.current);
      }
    };
  }, [items, engine]);

  // Callback to remove a line from the state and mark it as removed.
  const removeLine = useCallback((id: string) => {
    removedIds.current.add(id);
    setLines(prev => prev.filter(l => l.id !== id));
  }, []);

  return (
    <div className="command-feed-wrapper">
      <div className="command-feed-content">
        {lines.map(line => (
          <CommandLine
            key={line.id}
            text={line.display}
            className={line.id.startsWith('tip-') ? 'feed-line-tip' : ''}
            onDone={() => removeLine(line.id)}
          />
        ))}
      </div>
    </div>
  );
}
