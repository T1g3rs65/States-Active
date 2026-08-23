import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

type Props = {
  children: ReactNode;
  delay?: number;
  style?: ViewStyle | ViewStyle[];
};

export default function FadeUp({ children, delay = 0, style }: Props) {
  const y = useRef(new Animated.Value(16)).current;
  const o = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    y.setValue(16);
    o.setValue(0);
    const anim = Animated.parallel([
      Animated.timing(o, { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.spring(y, { toValue: 0, delay, friction: 8, tension: 70, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [delay, o, y]);

  return (
    <Animated.View style={[style, { opacity: o, transform: [{ translateY: y }] }]}>
      {children}
    </Animated.View>
  );
}
