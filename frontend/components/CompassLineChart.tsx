import { View } from 'react-native';
import Svg, { Path, Circle, Line, Rect, Text as SvgText, G } from 'react-native-svg';

export type ChartView = 'line' | 'bar';
export type Point = { value: number; label?: string; t?: number };

function ms(p: Point): number | null {
  const n = Number(p.t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function CompassLineChart({
  data,
  width,
  height = 250,
  color,
  view = 'line',
  overlay,
  overlayColor,
}: {
  data: Point[];
  width: number;
  height?: number;
  color: string;
  view?: ChartView;
  overlay?: Point[];
  overlayColor?: string;
}) {
  const padL = 40;
  const padR = 12;
  const padT = 16;
  const padB = 26;
  const w = Math.max(160, Math.round(width) || 280);
  const h = height;
  const innerW = Math.max(40, w - padL - padR);
  const innerH = Math.max(40, h - padT - padB);
  const overlaySeries = overlay || [];
  const overlayPts = overlaySeries.map((d) => Number(d.value) || 0);
  const vals = [...data.map((d) => Number(d.value) || 0), ...overlayPts];
  const n = data.length;
  if (n === 0 && overlayPts.length === 0) return <View style={{ width: w, height: h }} />;

  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const rawSpan = max - min;
  const yMin = rawSpan === 0 ? min - Math.max(1, Math.abs(min) * 0.05 || 1) : min - rawSpan * 0.08;
  const yMax = rawSpan === 0 ? max + Math.max(1, Math.abs(max) * 0.05 || 1) : max + rawSpan * 0.08;
  const ySpan = yMax - yMin || 1;
  const ink = color || '#DC2626';

  const times = [...data, ...overlaySeries].map(ms).filter((t): t is number => t != null);
  const tMin = times.length ? Math.min(...times) : 0;
  const tMax = times.length ? Math.max(...times) : 0;
  const useTime = overlaySeries.length > 0 && times.length >= 2 && tMax > tMin;

  const xAtIndex = (i: number, count: number) =>
    padL + (count <= 1 ? innerW / 2 : (i / (count - 1)) * innerW);

  const xAtT = (t: number) => {
    if (!useTime) return padL + innerW / 2;
    return padL + ((t - tMin) / (tMax - tMin)) * innerW;
  };

  const xOf = (p: Point, i: number, count: number) => {
    const t = ms(p);
    if (useTime && t != null) return xAtT(t);
    return xAtIndex(i, count);
  };

  const yAt = (v: number) => padT + (1 - (v - yMin) / ySpan) * innerH;
  const baseY = padT + innerH;
  const labelEvery = n <= 7 ? 1 : n <= 14 ? 2 : n <= 30 ? 5 : n <= 90 ? 15 : 30;
  const slot = innerW / Math.max(n, 1);
  const barW = Math.max(2, Math.min(18, slot * 0.62));

  const lineD = (series: Point[]) => {
    const count = series.length;
    if (count === 0) return '';
    const pts = series
      .map((d, i) => ({ x: xOf(d, i, count), y: yAt(Number(d.value) || 0) }))
      .sort((a, b) => a.x - b.x);
    if (pts.length === 1) return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    if (pts.length === 2) {
      return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} L ${pts[1].x.toFixed(1)} ${pts[1].y.toFixed(1)}`;
    }
    const t = 0.5;
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1x = p1.x + ((p2.x - p0.x) * t) / 3;
      const c1y = p1.y + ((p2.y - p0.y) * t) / 3;
      const c2x = p2.x - ((p3.x - p1.x) * t) / 3;
      const c2y = p2.y - ((p3.y - p1.y) * t) / 3;
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  };

  const smoothLineD = lineD(data);
  const overlayLine = overlaySeries.length ? lineD(overlaySeries) : '';
  const other = overlayColor || '#E8C36A';
  const firstX = n > 1 ? xOf(data[0], 0, n) : padL + innerW / 2;
  const lastX = n > 1 ? xOf(data[n - 1], n - 1, n) : padL + innerW / 2;
  const areaD =
    n > 1
      ? `${smoothLineD} L ${lastX.toFixed(1)} ${baseY.toFixed(1)} L ${firstX.toFixed(1)} ${baseY.toFixed(1)} Z`
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

        {view === 'bar'
          ? (() => {
              const comparing = overlaySeries.length > 0;
              const dayMap = new Map<number, { mine?: number; theirs?: number; label?: string }>();
              if (comparing && useTime) {
                data.forEach((d) => {
                  const t = ms(d);
                  if (t == null) return;
                  dayMap.set(t, { ...(dayMap.get(t) || {}), mine: Number(d.value) || 0, label: d.label });
                });
                overlaySeries.forEach((d) => {
                  const t = ms(d);
                  if (t == null) return;
                  dayMap.set(t, { ...(dayMap.get(t) || {}), theirs: Number(d.value) || 0 });
                });
                const days = [...dayMap.keys()].sort((a, b) => a - b);
                const count = Math.max(days.length, 1);
                const col = innerW / count;
                const pair = Math.max(2, Math.min(12, col * 0.36));
                const gap = 1.5;
                return days.map((t, i) => {
                  const row = dayMap.get(t)!;
                  const cx = padL + (i + 0.5) * col;
                  const bars: any[] = [];
                  if (row.mine != null) {
                    const y = yAt(row.mine);
                    bars.push(
                      <Rect
                        key={`bm${i}`}
                        x={cx - pair - gap / 2}
                        y={y}
                        width={pair}
                        height={Math.max(1, baseY - y)}
                        rx={Math.min(3, pair / 3)}
                        fill={ink}
                        opacity={i === days.length - 1 ? 1 : 0.78}
                      />
                    );
                  }
                  if (row.theirs != null) {
                    const y = yAt(row.theirs);
                    bars.push(
                      <Rect
                        key={`bo${i}`}
                        x={cx + gap / 2}
                        y={y}
                        width={pair}
                        height={Math.max(1, baseY - y)}
                        rx={Math.min(3, pair / 3)}
                        fill={other}
                        opacity={i === days.length - 1 ? 1 : 0.78}
                      />
                    );
                  }
                  return <G key={`bg${i}`}>{bars}</G>;
                });
              }
              return data.map((d, i) => {
                const cx = n === 1 ? padL + innerW / 2 : padL + (i + 0.5) * slot;
                const y = yAt(Number(d.value) || 0);
                const bh = Math.max(1, baseY - y);
                return (
                  <Rect
                    key={`b${i}`}
                    x={cx - barW / 2}
                    y={y}
                    width={barW}
                    height={bh}
                    rx={Math.min(3, barW / 3)}
                    fill={ink}
                    opacity={i === n - 1 ? 1 : 0.72}
                  />
                );
              });
            })()
          : (
            <>
              {n > 1 ? <Path d={areaD} fill={ink} fillOpacity={0.22} /> : null}
              {n > 1 ? (
                <Path
                  d={smoothLineD}
                  fill="none"
                  stroke={ink}
                  strokeWidth={2.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
              {n > 1 ? (
                <Line
                  x1={lastX}
                  y1={padT}
                  x2={lastX}
                  y2={baseY}
                  stroke={ink}
                  strokeWidth={1}
                  strokeDasharray="2 4"
                  opacity={0.35}
                />
              ) : null}
              {data.map((d, i) => (
                <Circle
                  key={`p${i}`}
                  cx={xOf(d, i, n)}
                  cy={yAt(Number(d.value) || 0)}
                  r={i === n - 1 ? 5 : n > 30 ? 2.2 : 3.4}
                  fill={ink}
                />
              ))}
              {n > 0 ? (
                <Circle
                  cx={xOf(data[n - 1], n - 1, n)}
                  cy={yAt(Number(data[n - 1].value) || 0)}
                  r={9}
                  fill="none"
                  stroke={ink}
                  strokeWidth={1.4}
                  opacity={0.35}
                />
              ) : null}
              {overlayLine && view === 'line' ? (
                <Path
                  d={overlayLine}
                  fill="none"
                  stroke={other}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="6 4"
                />
              ) : null}
              {overlaySeries.map((d, i) => (
                <Circle
                  key={`o${i}`}
                  cx={xOf(d, i, overlaySeries.length)}
                  cy={yAt(Number(d.value) || 0)}
                  r={i === overlaySeries.length - 1 ? 4.5 : 2.4}
                  fill={other}
                />
              ))}
            </>
          )}

        {data.map((d, i) =>
          i % labelEvery === 0 && d.label ? (
            <SvgText
              key={`l${i}`}
              x={view === 'bar' ? (n === 1 ? padL + innerW / 2 : padL + (i + 0.5) * slot) : xOf(d, i, n)}
              y={h - 7}
              fill="rgba(243,246,250,0.7)"
              fontSize={8}
              textAnchor="middle"
            >
              {d.label}
            </SvgText>
          ) : null
        )}
      </Svg>
    </View>
  );
}
