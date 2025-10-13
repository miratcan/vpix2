import './Palette.css';

type Props = { palette: string[]; currentIndex: number };

export default function Palette({ palette, currentIndex }: Props) {
  return (
    <div className="palette">
      {palette.map((c, i) => (
        <button
          key={i}
          type="button"
          className={`swatch${i === currentIndex ? ' active' : ''}`}
          aria-pressed={i === currentIndex}
        >
          <span className="chip" style={{ background: c }}>
            <span className="key">{i + 1}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
