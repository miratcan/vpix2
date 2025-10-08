import './Palette.css';

type Props = { palette: string[]; currentIndex: number };

export default function Palette({ palette, currentIndex }: Props) {
  return (
    <div className="palette">
      {palette.map((c, i) => (
        <div key={i} className={`swatch${i === currentIndex ? ' active' : ''}`}>
          <span className="chip" style={{ background: c }}>
            <span className="key">{i + 1}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
