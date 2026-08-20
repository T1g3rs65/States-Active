import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, typography, spacing, radii } from '../utils/theme';

interface DonutSlice {
  name: string;
  population: number; // percentage 0-100
  color: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = (Math.PI / 180) * (angleDeg - 90);
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(
    2
  )} 0 ${largeArcFlag} 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export default function DonutChart({
  data,
  size = 180,
  thickness = 24,
}: DonutChartProps) {
  const valid = data.filter(d => d.population > 0);
  const total = valid.reduce((sum, d) => sum + d.population, 0) || 100;
  const radius = (size - thickness) / 2;
  const center = size / 2;

  let cursor = 0;
  const slices = valid.map(item => {
    const sweep = (item.population / total) * 360;
    const start = cursor;
    const end = cursor + sweep;
    cursor = end;
    return { ...item, start, end };
  });

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {slices.length === 0 && (
          <Path
            d={describeArc(center, center, radius, 0, 360)}
            stroke={colors.glass.border}
            strokeWidth={thickness}
            fill="none"
          />
        )}
        {slices.map((slice, idx) => (
          <Path
            key={`${slice.name}-${idx}`}
            d={describeArc(center, center, radius, slice.start, slice.end)}
            stroke={slice.color}
            strokeWidth={thickness}
            fill="none"
            strokeLinecap="butt"
          />
        ))}
      </Svg>

      <View style={styles.legend}>
        {slices.map((slice, idx) => (
          <View key={`${slice.name}-${idx}`} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: slice.color }]} />
            <Text style={styles.legendLabel}>{slice.name}</Text>
            <Text style={styles.legendValue}>{Math.round(slice.population)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  legend: {
    flex: 1,
    minWidth: 120,
    gap: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: radii.sm,
  },
  legendLabel: {
    ...typography.small,
    flex: 1,
    color: colors.text.secondary,
  },
  legendValue: {
    ...typography.small,
    color: colors.text.primary,
    fontWeight: '600',
  },
});
