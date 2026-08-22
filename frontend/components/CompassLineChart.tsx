import { View } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop, Path, G } from 'react-native-svg';

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
  const padL = 36;
  const padR = 10;
  const padT = 12;
  const padB = 22;
  const w = Math.max(80, width);
  const h = height;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const vals = data.map((d) => d.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const n = data.length;
  const xAt = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yAt = (v: number) => padT + (1 - (v - min) / span) * innerH;
  const pts = data.map((d, i) => `${xAt(i).toFixed(1)},${yAt(d.value).toFixed(1)}`).join(' ');
  const area = `M ${xAt(0).toFixed(1)},${(padT + innerH).toFixed(1)} L ${pts.replace(/ /g, ' L ')} L ${xAt(n - 1).toFixed(1)},${(padT + innerH).toFixed(1)} Z`;
  const labelEvery = n <= 7 ? 1 : n <= 14 ? 2 : n <= 30 ? 5 : n <= 90 ? 15 : 30;
  const gid = `fill_${String(color).replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <View>
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.35} />
            <Stop offset="1" stopColor={color} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const y = padT + (i / 5) * innerH;
          const v = max - (i / 5) * span;
          return (
            <G key={`g${i}`}>
              <Line x1={padL} y1={y} x2={w - padR} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
              <SvgText x={padL - 4} y={y + 3} fill="rgba(243,246,250,0.70)" fontSize={10} textAnchor="end">
                {Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1)}
              </SvgText>
            </G>
          );
        })}
        {n > 1 ? <Path d={area} fill={`url(#${gid})`} /> : null}
        {n > 1 ? (
          <Polyline points={pts} fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
        ) : null}
        {n <= 60
          ? data.map((d, i) => <Circle key={`p${i}`} cx={xAt(i)} cy={yAt(d.value)} r={n > 30 ? 2 : 3.5} fill={color} />)
          : null}
        {data.map((d, i) =>
          i % labelEvery === 0 && d.label ? (
            <SvgText key={`l${i}`} x={xAt(i)} y={h - 6} fill="rgba(243,246,250,0.70)" fontSize={8} textAnchor="middle">
              {d.label}
            </SvgText>
          ) : null
        )}
      </Svg>
    </View>
  );
}
