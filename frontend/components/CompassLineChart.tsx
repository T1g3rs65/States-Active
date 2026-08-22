import { View } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText, G } from 'react-native-svg';

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
  const padT = 16;
  const padB = 26;
  const w = Math.max(160, Math.round(width) || 280);
  const h = height;
  const innerW = Math.max(40, w - padL - padR);
  const innerH = Math.max(40, h - padT - padB);
  const vals = data.map((d) => Number(d.value) || 0);
  const n = data.length;
  if (n === 0) return <View style={{ width: w, height: h }} />;

  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const rawSpan = max - min;
  const yMin = rawSpan === 0 ? min - Math.max(1, Math.abs(min) * 0.05 || 1) : min - rawSpan * 0.08;
  const yMax = rawSpan === 0 ? max + Math.max(1, Math.abs(max) * 0.05 || 1) : max + rawSpan * 0.08;
  const ySpan = yMax - yMin || 1;
  const ink = color || '#DC2626';

  const xAt = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yAt = (v: number) => padT + (1 - (v - yMin) / ySpan) * innerH;
  const labelEvery = n <= 7 ? 1 : n <= 14 ? 2 : n <= 30 ? 5 : n <= 90 ? 15 : 30;

  const lineD = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(Number(d.value) || 0).toFixed(1)}`)
    .join(' ');
  const areaD =
    n > 1
      ? `${lineD} L ${xAt(n - 1).toFixed(1)} ${(padT + innerH).toFixed(1)} L ${xAt(0).toFixed(1)} ${(padT + innerH).toFixed(1)} Z`
      : '';

  return (
    <View>
      <Svg width={w} height={h}>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const y = padT + (i / 5) * innerH;
          const v = yMax - (i / 5) * ySpan;
          return (
            <G key={`g${i}`}>
              <Line x1={padL} y1={y} x2={w - padR} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} strokeDasharray="3 5" />
              <SvgText x={padL - 6} y={y + 3} fill="rgba(243,246,250,0.7)" fontSize={10} textAnchor="end">
                {Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1)}
              </SvgText>
            </G>
          );
        })}
        {n > 1 ? <Path d={areaD} fill={ink} fillOpacity={0.22} /> : null}
        {data.slice(1).map((d, i) => (
          <Line
            key={`s${i}`}
            x1={xAt(i)}
            y1={yAt(Number(data[i].value) || 0)}
            x2={xAt(i + 1)}
            y2={yAt(Number(d.value) || 0)}
            stroke={ink}
            strokeWidth={2.6}
          />
        ))}
        {n > 1 ? (
          <Line
            x1={xAt(n - 1)}
            y1={padT}
            x2={xAt(n - 1)}
            y2={padT + innerH}
            stroke={ink}
            strokeWidth={1}
            strokeDasharray="2 4"
            opacity={0.35}
          />
        ) : null}
        {data.map((d, i) => (
          <Circle
            key={`p${i}`}
            cx={xAt(i)}
            cy={yAt(Number(d.value) || 0)}
            r={i === n - 1 ? 5 : n > 30 ? 2.2 : 3.4}
            fill={ink}
          />
        ))}
        {n > 0 ? (
          <Circle
            cx={xAt(n - 1)}
            cy={yAt(Number(data[n - 1].value) || 0)}
            r={9}
            fill="none"
            stroke={ink}
            strokeWidth={1.4}
            opacity={0.35}
          />
        ) : null}
        {data.map((d, i) =>
          i % labelEvery === 0 && d.label ? (
            <SvgText key={`l${i}`} x={xAt(i)} y={h - 7} fill="rgba(243,246,250,0.7)" fontSize={8} textAnchor="middle">
              {d.label}
            </SvgText>
          ) : null
        )}
      </Svg>
    </View>
  );
}
