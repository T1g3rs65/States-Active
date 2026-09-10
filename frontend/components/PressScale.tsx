import { useRef } from 'react';
import type { ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, ViewStyle, Platform } from 'react-native';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
};

export default function PressScale({ children, onPress, disabled, style }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, friction: 7, tension: 160 }).start();

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => !disabled && press(0.96)}
      onPressOut={() => press(1)}
      style={({ pressed }) => [
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        disabled && Platform.OS === 'web' ? ({ cursor: 'not-allowed', pointerEvents: 'none' } as unknown as ViewStyle) : null,
      ]}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.92 },
});
