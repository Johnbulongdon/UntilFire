"use client";
export default function YearCubes({ colors, reduce = false }: { colors: string[]; reduce?: boolean }) {
  return <>{colors.map((color, i) => <div key={i} className="uf-year-cube" aria-hidden="true">
    <div className="uf-year-cube-inner" style={{ animationDelay: `${Math.min(i * 10, 500)}ms`, ...(reduce ? { animation: 'none', transform: 'rotateY(180deg)' } : {}) }}>
      <span className="uf-year-face" style={{ background: 'var(--uf-border-2)' }} />
      <span className="uf-year-face uf-year-face-back" style={{ background: color }} />
    </div>
  </div>)}</>;
}
