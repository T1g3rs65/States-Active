import { useEffect } from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { useNationStore } from '../store/nationStore';
import { leaningColor } from '../utils/politicalCompass';
import { ASME_CSS, hexToRgbTriplet } from '../utils/asmeStyle';

let injected = false;
function ensureCss() {
  if (injected || Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('asme-liquid')) return;
  const el = document.createElement('style');
  el.id = 'asme-liquid';
  el.textContent = ASME_CSS;
  document.head.appendChild(el);
  injected = true;
}

type Props = {
  children?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  radius?: number;
  padded?: boolean;
};

/** Frosted pill / card. Compass-tinted rim. Web uses ASME liquid-glass CSS. */
export default function LiquidGlass({ children, style, radius = 28, padded }: Props) {
  const tint = leaningColor(useNationStore((s) => s.nation));
  useEffect(() => {
    ensureCss();
  }, []);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.style.setProperty('--glass-tint', hexToRgbTriplet(tint));
  }, [tint]);

  return (
    <View
      // @ts-expect-error web className
      className="liquid-glass"
      style={[
        styles.base,
        { borderRadius: radius },
        padded ? styles.pad : null,
        Platform.OS !== 'web' ? { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: tint } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  pad: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
