import './ModeIndicator.css';

type ModeIndicatorProps = {
  mode: string;
};

const MODE_LABELS: Record<string, string> = {
  normal: 'Normal',
  visual: 'Visual',
  insert: 'Insert',
};

export default function ModeIndicator({ mode }: ModeIndicatorProps) {
  const normalized = typeof mode === 'string' ? mode.toLowerCase() : '';
  const display = MODE_LABELS[normalized] ?? (mode ? mode.toString() : 'Unknown');

  return (
    <div className="mode-indicator">
      <span className="mode-indicator__value">{typeof display === 'string' ? display.toUpperCase() : display}</span>
    </div>
  );
}
