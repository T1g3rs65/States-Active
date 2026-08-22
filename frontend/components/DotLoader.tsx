import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';

type Props = {
  frames: number[][];
  duration?: number;
  color: string;
  dim?: string;
  size?: number;
  gap?: number;
};

export default function DotLoader({
  frames,
  duration = 140,
  color,
  dim = 'rgba(243,246,250,0.14)',
  size = 5,
  gap = 2,
}: Props) {
  const [frame, setFrame] = useState(0);
  const framesRef = useRef(frames);
  framesRef.current = frames;

  useEffect(() => {
    setFrame(0);
    if (!frames.length) return;
    const id = setInterval(() => {
      setFrame((i) => (i + 1) % framesRef.current.length);
    }, duration);
    return () => clearInterval(id);
  }, [frames, duration]);

  const active = frames[frame] || [];
  return (
    <View style={[styles.grid, { width: size * 7 + gap * 6, gap }]}>
      {Array.from({ length: 49 }, (_, i) => (
        <View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: 1.5,
            backgroundColor: active.includes(i) ? color : dim,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: 49,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
