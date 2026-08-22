import { Image, View } from 'react-native';

type Point = { value: number; label?: string };

export default function CompassLineChart({
  data,
  width,
  height = 250,
  color,
}: {
  data: Point[];
  width: number;
  height?: number;
  color: string;
}) {
  const padL = 40;
  const padR = 12;
  const padT = 14;
  const padB = 24;
  const w = Math.max(120, Math.round(width));
  const h = height;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const vals = data.map((d) => Number(d.value) || 0);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const n = data.length;
  const xAt = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yAt = (v: number) => padT + (1 - (v - min) / span) * innerH;
  const line = data.map((d, i) => `${xAt(i).toFixed(1)},${yAt(Number(d.value) || 0).toFixed(1)}`).join(' ');
  const area =
    n > 1
      ? `M ${xAt(0).toFixed(1)} ${(padT + innerH).toFixed(1)} L ${data
          .map((d, i) => `${xAt(i).toFixed(1)} ${yAt(Number(d.value) || 0).toFixed(1)}`)
          .join(' L ')} L ${xAt(n - 1).toFixed(1)} ${(padT + innerH).toFixed(1)} Z`
      : '';
  const labelEvery = n <= 7 ? 1 : n <= 14 ? 2 : n <= 30 ? 5 : n <= 90 ? 15 : 30;
  const ink = color || '#DC2626';

  const grid = [0, 1, 2, 3, 4, 5]
    .map((i) => {
      const y = padT + (i / 5) * innerH;
      const v = max - (i / 5) * span;
      const label = Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1);
      return `<line x1="${padL}" y1="${y}" x2="${w - padR}" y2="${y}" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
        <text x="${padL - 6}" y="${y + 4}" fill="rgba(243,246,250,0.7)" font-size="10" text-anchor="end">${label}</text>`;
    })
    .join('');
  const xLabels = data
    .map((d, i) =>
      i % labelEvery === 0 && d.label
        ? `<text x="${xAt(i)}" y="${h - 6}" fill="rgba(243,246,250,0.7)" font-size="8" text-anchor="middle">${d.label}</text>`
        : ''
    )
    .join('');
  const dots =
    n <= 60
      ? data
          .map((d, i) => `<circle cx="${xAt(i)}" cy="${yAt(Number(d.value) || 0)}" r="${n > 30 ? 2 : 3.5}" fill="${ink}"/>`)
          .join('')
      : '';

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  ${grid}
  ${n > 1 ? `<path d="${area}" fill="${ink}" fill-opacity="0.22"/>` : ''}
  ${n > 1 ? `<polyline points="${line}" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>` : ''}
  ${dots}
  ${xLabels}
</svg>`;

  return (
    <View>
      <Image
        source={{ uri: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` }}
        style={{ width: w, height: h }}
        resizeMode="contain"
      />
    </View>
  );
}
