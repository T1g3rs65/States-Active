import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import AuroraBackground from './AuroraBackground';

/** Solid canvas so stacked routes cannot show through, plus local aurora. */
export default function ScreenCanvas({ children }: { children: ReactNode }) {
  return (
    <View style={styles.base}>
      <AuroraBackground />
      <View style={styles.fg}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { flex: 1, backgroundColor: '#08090A' },
  fg: { flex: 1, zIndex: 1, backgroundColor: 'transparent' },
});
