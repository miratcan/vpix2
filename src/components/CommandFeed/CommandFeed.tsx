import './CommandFeed.css';

type Item = { id: string; display: string };

export default function CommandFeed({ items, rows = 5 }: { items: Item[]; rows?: number }) {
  const visible = items.slice(-rows);
  const baseOpacity = (idx: number, total: number) => {
    if (total <= 1) return 1;
    // Map 0..total-1 top->bottom; bottom most opaque
    const rel = idx / (total - 1);
    return 0.15 + rel * 0.85; // 0.15 .. 1.0
  };
  return (
    <div className="command-feed" aria-live="polite">
      {visible.map((item, i) => (
        <div key={`${i}-${item.id}`} className="feed-line" style={{ opacity: baseOpacity(i, visible.length) }}>
          {item.display}
        </div>
      ))}
    </div>
  );
}

