import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  AccessibilityInfo,
  Platform,
  Pressable,
} from 'react-native';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';
import { WheelOption, WheelId } from '../types';
import { GRID_COLORS } from '../utils/politicalCompass';

const SLICE_COLORS = [
  GRID_COLORS.authRight,
  GRID_COLORS.midRight,
  GRID_COLORS.libRight,
  GRID_COLORS.authCenter,
  GRID_COLORS.midCenter,
  GRID_COLORS.libCenter,
  GRID_COLORS.authLeft,
  GRID_COLORS.midLeft,
  GRID_COLORS.libLeft,
];

const SPIN_DURATION = 4200;
const FULL_TURNS = 6;
const BEZIER = [0.12, 0.72, 0.08, 1] as const;

interface GovernmentWheelProps {
  wheelId: WheelId;
  label: string;
  options: WheelOption[];
  result?: string;
  onComplete?: (result: string) => void;
  disabled?: boolean;
  size?: number;
  showLegend?: boolean;
  onHubPress?: () => void;
  hubBusy?: boolean;
}

interface SliceGeom {
  path: string;
  color: string;
  start: number;
  end: number;
  center: number;
  label: string;
  sweep: number;
}

function slicePath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const rad = (d: number) => (d * Math.PI) / 180;
  const pt = (a: number) => ({
    x: cx + r * Math.sin(rad(a)),
    y: cy - r * Math.cos(rad(a)),
  });
  const s = pt(a0);
  const e = pt(a1);
  const largeArc = a1 - a0 > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y} Z`;
}

function buildSlices(options: WheelOption[], size: number): SliceGeom[] {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 8;
  const total = options.reduce((s, o) => s + o.weight, 0) || 1;
  let cursor = 0;
  return options.map((opt, i) => {
    const start = (cursor / total) * 360;
    cursor += opt.weight;
    const end = (cursor / total) * 360;
    return {
      path: slicePath(cx, cy, r, start, end),
      color: SLICE_COLORS[i % SLICE_COLORS.length],
      start,
      end,
      center: (start + end) / 2,
      label: opt.label,
      sweep: end - start,
    };
  });
}

function prettyLabel(label: string): string {
  if (!label) return '';
  if (label.includes(' ') || label.includes('/')) return label;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function shortLabel(label: string): string {
  const cut = prettyLabel(label).split(' / ')[0];
  return cut.length > 16 ? cut.slice(0, 14) + '…' : cut;
}

function sliceColor(index: number): string {
  return SLICE_COLORS[index % SLICE_COLORS.length];
}

export default function GovernmentWheel({
  wheelId,
  label,
  options,
  result,
  onComplete,
  disabled,
  size = 150,
  showLegend = false,
  onHubPress,
  hubBusy = false,
}: GovernmentWheelProps) {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const reducedRef = useRef(false);
  const [spinning, setSpinning] = useState(false);
  const [settled, setSettled] = useState(false);

  const innerR = size * 0.22;
  const slices = buildSlices(options, size);
  const winnerIdx = result ? slices.findIndex((s) => s.label === result) : -1;
  const targetDeg =
    winnerIdx >= 0
      ? ((360 - slices[winnerIdx].center) % 360) + FULL_TURNS * 360
      : FULL_TURNS * 360;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (!mounted) return;
      reducedRef.current = on;
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (result == null) {
      setSettled(false);
      setSpinning(false);
      spin.setValue(0);
      return;
    }

    if (reducedRef.current) {
      spin.setValue(1);
      setSpinning(false);
      setSettled(true);
      onComplete?.(result);
      return;
    }

    setSettled(false);
    setSpinning(true);
    spin.setValue(0);
    const anim = Animated.timing(spin, {
      toValue: 1,
      duration: SPIN_DURATION,
      easing: Easing.bezier(BEZIER[0], BEZIER[1], BEZIER[2], BEZIER[3]),
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (!finished) return;
      setSpinning(false);
      setSettled(true);
      onComplete?.(result);
    });
    return () => anim.stop();
  }, [result]);

  const rotation = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${targetDeg}deg`],
  });

  useEffect(() => {
    if (!settled) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [settled, pulse]);

  const dormant = disabled && result == null;
  const cx = size / 2;
  const r = size / 2 - 8;
  const winColor = winnerIdx >= 0 ? slices[winnerIdx].color : '#E8C36A';

  return (
    <View style={[styles.wrap, { width: size }]} accessible={false}>
      <Animated.View
        style={[
          styles.disc,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: settled
              ? winColor
              : spinning
                ? 'rgba(232,195,106,0.85)'
                : 'rgba(255,255,255,0.28)',
            ...(Platform.OS === 'web'
              ? {
                  boxShadow: settled
                    ? `0 0 28px ${winColor}66, 0 8px 24px rgba(0,0,0,0.45)`
                    : '0 8px 28px rgba(0,0,0,0.45)',
                }
              : null),
          },
          dormant && styles.discDormant,
          settled && { borderWidth: 3 },
        ]}
      >
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: rotation }] }]}>
          <Svg width={size} height={size}>
            <Circle cx={cx} cy={cx} r={r + 4} fill="#07080A" />
            {slices.map((s, i) => (
              <Path
                key={i}
                d={s.path}
                fill={s.color}
                opacity={settled && i === winnerIdx ? 1 : settled ? 0.55 : 0.92}
                stroke="rgba(0,0,0,0.55)"
                strokeWidth={1.25}
              />
            ))}
            {slices.map((s, i) => {
              if (s.sweep < 22 || size < 180) return null;
              const rad = (s.center * Math.PI) / 180;
              const tx = cx + r * 0.62 * Math.sin(rad);
              const ty = cx - r * 0.62 * Math.cos(rad);
              return (
                <G key={`lbl-${i}`}>
                  <SvgText
                    x={tx}
                    y={ty}
                    fill="rgba(255,255,255,0.92)"
                    fontSize={Math.max(8, size * 0.032)}
                    fontWeight="600"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                  >
                    {shortLabel(s.label)}
                  </SvgText>
                </G>
              );
            })}
            <Circle cx={cx} cy={cx} r={innerR + 6} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth={6} />
            <Circle cx={cx} cy={cx} r={innerR + 2} fill="none" stroke="rgba(232,195,106,0.35)" strokeWidth={1.5} />
          </Svg>
        </Animated.View>

        {/* Fixed pointer — does not rotate */}
        <View style={styles.pointerWrap} pointerEvents="none">
          <View style={[styles.pointerShadow, { borderTopColor: 'rgba(0,0,0,0.5)' }]} />
          <View style={styles.pointer} />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            spinning || hubBusy
              ? 'Wheel spinning'
              : settled
                ? `${prettyLabel(result || label)} locked`
                : onHubPress
                  ? `Spin ${label}`
                  : label
          }
          disabled={disabled || spinning || hubBusy || !onHubPress}
          onPress={onHubPress}
          style={[
            styles.hub,
            {
              width: innerR * 2,
              height: innerR * 2,
              borderRadius: innerR,
            },
          ]}
        >
          <Text style={[styles.hubKicker, { fontSize: Math.max(8, size * 0.036) }]}>
            {spinning || hubBusy ? 'SPINNING' : settled && onHubPress ? 'TAP NEXT' : settled ? 'LOCKED' : onHubPress ? 'TAP TO SPIN' : label.toUpperCase()}
          </Text>
        </Pressable>
      </Animated.View>

      <View style={styles.captionRow}>
        <Text
          style={[
            styles.caption,
            { maxWidth: size, color: settled ? '#F4F5F6' : '#7C818A' },
          ]}
          numberOfLines={2}
        >
          {dormant ? '—' : settled ? prettyLabel(result || '') : spinning ? 'Settling…' : '—'}
        </Text>
      </View>

      {showLegend && options.length > 0 && (
        <WheelLegend options={options} winner={settled ? result ?? null : null} />
      )}
    </View>
  );
}

function WheelLegend({ options, winner }: { options: WheelOption[]; winner: string | null }) {
  const total = options.reduce((s, o) => s + o.weight, 0) || 1;
  return (
    <View style={styles.legend}>
      {options.map((opt, i) => {
        const isWin = winner === opt.label;
        const pct = Math.round((opt.weight / total) * 100);
        return (
          <View key={opt.label} style={[styles.legendRow, isWin && styles.legendRowWin]}>
            <View style={[styles.legendDot, { backgroundColor: sliceColor(i) }]} />
            <Text style={[styles.legendLabel, isWin && styles.legendLabelWin]} numberOfLines={2}>
              {opt.label}
            </Text>
            <Text style={[styles.legendPct, isWin && styles.legendLabelWin]}>{pct}%</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  disc: {
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#07080A',
  },
  discDormant: {
    opacity: 0.42,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  pointerWrap: {
    position: 'absolute',
    top: -2,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 4,
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 18,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#E8C36A',
  },
  pointerShadow: {
    position: 'absolute',
    top: 2,
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 18,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  hub: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    margin: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,9,12,0.92)',
    borderWidth: 1.5,
    borderColor: 'rgba(232,195,106,0.45)',
    zIndex: 3,
  },
  hubKicker: {
    color: '#E8C36A',
    fontWeight: '700',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  captionRow: {
    marginTop: 10,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  caption: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  legend: {
    marginTop: 12,
    width: '100%',
    gap: 5,
    paddingHorizontal: 2,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  legendRowWin: {
    backgroundColor: 'rgba(232,195,106,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(232,195,106,0.55)',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
    flexShrink: 0,
  },
  legendLabel: {
    flex: 1,
    color: '#B4B8C0',
    fontSize: 12,
    lineHeight: 16,
  },
  legendLabelWin: {
    color: '#F4F5F6',
    fontWeight: '600',
  },
  legendPct: {
    color: 'rgba(243,246,250,0.45)',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
  },
});
