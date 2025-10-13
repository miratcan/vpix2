import './CommandFeed.css';
import type { EngineLogEntry } from '../../../core/engine/types';

type CommandFeedProps = {
  logs: ReadonlyArray<EngineLogEntry>;
};

export default function CommandFeed({ logs }: CommandFeedProps) {
  return (
    <div className="command-feed-wrapper">
      <div className="command-feed-content">
        {logs.map((entry) => (
          <div
            key={entry.id}
            className={`feed-line${entry.kind === 'error' ? ' feed-line-error' : ''}`}
          >
            {entry.message}
          </div>
        ))}
      </div>
    </div>
  );
}
