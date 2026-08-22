import { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, View } from 'react-native';
import { useNationStore } from '../store/nationStore';
import { hexAlpha, leaningColor } from '../utils/politicalCompass';

const STARS = Array.from({ length: 28 }, (_, i) => ({
  left: ((i * 37) % 100),
  top: ((i * 53 + 11) % 100),
  size: 1 + (i % 3),
  delay: (i * 170) % 2400,
  dur: 2200 + (i % 5) * 400,
}));

function PulseBlob({
  color,
  style,
  duration,
  dx,
  dy,
}: {
  color: string;
  style: object;
  duration: number;
  dx: number;
  dy: number;
}) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [duration, t]);
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [-dx, dx] });
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [-dy, dy] });
  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.blob,
        style,
        { backgroundColor: color, transform: [{ translateX }, { translateY }, { scale }] },
      ]}
    />
  );
}

function Star({ left, top, size, delay, dur }: (typeof STARS)[number]) {
  const o = useRef(new Animated.Value(0.08)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(o, { toValue: 0.85, duration: dur, useNativeDriver: true }),
        Animated.timing(o, { toValue: 0.05, duration: dur, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delay, dur, o]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: `${left}%` as any,
        top: `${top}%` as any,
        width: size,
        height: size,
        borderRadius: 4,
        backgroundColor: '#F4F5F6',
        opacity: o,
      }}
    />
  );
}

/** Dark aurora + stars. Compass-tinted. Does not steal taps. */
export default function AuroraBackground() {
  const nation = useNationStore((s) => s.nation);
  const tint = leaningColor(nation);
  const a = useMemo(() => hexAlpha(tint, 0.22), [tint]);
  const b = useMemo(() => hexAlpha(tint, 0.12), [tint]);
  const { width, height } = Dimensions.get('window');

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View style={[styles.fill, { backgroundColor: '#000000' }]} />
      <PulseBlob color={a} duration={14000} dx={width * 0.08} dy={height * 0.04} style={styles.blobA} />
      <PulseBlob color={b} duration={18000} dx={width * 0.07} dy={height * 0.05} style={styles.blobB} />
      <PulseBlob color={hexAlpha(tint, 0.1)} duration={22000} dx={width * 0.05} dy={height * 0.06} style={styles.blobC} />
      {STARS.map((s, i) => (
        <Star key={i} {...s} />
      ))}
    </View>
  );
}

const blur = Platform.OS === 'web' ? ({ filter: 'blur(72px)' } as any) : {};

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
    overflow: 'hidden',
  },
  fill: { ...StyleSheet.absoluteFill },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    ...blur,
  },
  blobA: { top: '-18%', left: '-16%', width: '62%', height: '52%' },
  blobB: { bottom: '-20%', right: '-18%', width: '58%', height: '50%' },
  blobC: { top: '28%', left: '28%', width: '38%', height: '34%' },
});
