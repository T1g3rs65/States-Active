import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import AuroraBackground from './AuroraBackground';
import LiquidGlass from './LiquidGlass';

/** Solid canvas so stacked routes cannot show through, plus local aurora. */
export default function ScreenCanvas({ children }: { children: ReactNode }) {
  return (
    <View style={styles.base}>
      <AuroraBackground />
      <View style={styles.fg}>{children}</View>
      {/* mount once so --glass-tint + CSS inject */}
      <View style={styles.hidden} pointerEvents="none">
        <LiquidGlass radius={0} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { flex: 1, backgroundColor: '#000000' },
  fg: { flex: 1, zIndex: 1, backgroundColor: 'transparent' },
  hidden: { position: 'absolute', width: 0, height: 0, overflow: 'hidden' },
});
