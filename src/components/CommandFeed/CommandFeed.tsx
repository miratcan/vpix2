import { useEffect, useState, useRef } from 'react';
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
type CommandFeedItem = { id: number; text: string; type: string };

export default function CommandFeed({ items = [] }: { items?: CommandFeedItem[] }) {
  // Note: The parent (`App.tsx`) is now responsible for managing the items list.
  // This component just renders them and handles the fade-out animation.
  const [visibleItems, setVisibleItems] = useState(items);

  useEffect(() => {
    setVisibleItems(items);
  }, [items]);

  const removeLine = (id: number) => {
    setVisibleItems(prev => prev.filter(l => l.id !== id));
  };

  return (
    <div className="command-feed-wrapper">
      <div className="command-feed-content">
        {visibleItems.map(line => (
          <CommandLine
            key={line.id}
            text={line.text}
            className={line.type === 'tip' ? 'feed-line-tip' : ''}
            onDone={() => removeLine(line.id)}
          />
        ))}
      </div>
    </div>
  );
}
