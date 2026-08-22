import { useIsFocused } from '@react-navigation/native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

/** Hide blurred routes so transparent aurora cannot stack old screens. */
export default function FocusGate({ children }: { children: ReactNode }) {
  const focused = useIsFocused();
  return (
    <View style={[styles.fill, !focused && styles.hidden]} pointerEvents={focused ? 'auto' : 'none'}>
      {focused ? children : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  hidden: { display: 'none', height: 0, overflow: 'hidden' },
});
