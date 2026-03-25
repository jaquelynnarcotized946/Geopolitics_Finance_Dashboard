/**
 * Minimal world map SVG - subtle dotted grid with faint landmass outlines.
 * Designed to be a background, not the main focus.
 */
export default function WorldMapSvg() {
  return (
    <svg
      viewBox="0 0 1000 500"
      className="absolute inset-0 h-full w-full opacity-40"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Subtle dot grid */}
      {Array.from({ length: 19 }, (_, r) =>
        Array.from({ length: 39 }, (_, c) => (
          <circle
            key={`${r}-${c}`}
            cx={(c + 1) * 25}
            cy={(r + 1) * 25}
            r="0.6"
            fill="rgba(255,255,255,0.08)"
          />
        ))
      )}

      {/* Equator */}
      <line x1="0" y1="250" x2="1000" y2="250" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" strokeDasharray="6,6" />
      {/* Tropics */}
      <line x1="0" y1="185" x2="1000" y2="185" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" strokeDasharray="4,8" />
      <line x1="0" y1="315" x2="1000" y2="315" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" strokeDasharray="4,8" />
    </svg>
  );
}
