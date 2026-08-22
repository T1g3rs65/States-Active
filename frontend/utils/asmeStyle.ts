/** ASME-inspired liquid glass. Compass tint via --glass-tint. Inject once. */
export const ASME_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap');

:root {
  --glass-tint: 255, 255, 255;
}

html, body, #root {
  background: #000 !important;
  font-family: Inter, system-ui, sans-serif;
}

::selection {
  background: rgba(255, 255, 255, 0.22);
  color: #000;
}

.liquid-glass {
  background: rgba(var(--glass-tint), 0.045);
  background-blend-mode: luminosity;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: none;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.12);
  position: relative;
  overflow: hidden;
}

.liquid-glass::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1.3px;
  background: linear-gradient(
    180deg,
    rgba(var(--glass-tint), 0.55) 0%,
    rgba(255, 255, 255, 0.14) 20%,
    rgba(255, 255, 255, 0) 40%,
    rgba(255, 255, 255, 0) 60%,
    rgba(255, 255, 255, 0.12) 80%,
    rgba(var(--glass-tint), 0.42) 100%
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  z-index: 2;
}

.serif-accent {
  font-family: 'Instrument Serif', Georgia, serif;
  font-style: italic;
  font-weight: 400;
}

.asme-title {
  font-family: 'Instrument Serif', Georgia, serif;
  font-weight: 400;
  letter-spacing: -0.03em;
}
`;

export function hexToRgbTriplet(hex: string): string {
  const h = (hex || '#ffffff').replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(n.slice(0, 2), 16) || 255;
  const g = parseInt(n.slice(2, 4), 16) || 255;
  const b = parseInt(n.slice(4, 6), 16) || 255;
  return `${r}, ${g}, ${b}`;
}
