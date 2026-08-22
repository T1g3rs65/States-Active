import { View, StyleSheet, Image } from 'react-native';

const GRAIN =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#n)" opacity="0.055"/></svg>`
  );

/** Nexus Studio grain, RN-safe. Pointer-events none so it never eats taps. */
export default function Grain() {
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Image source={{ uri: GRAIN }} style={styles.img} resizeMode="repeat" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    zIndex: 40,
    opacity: 0.55,
  },
  img: {
    width: '100%',
    height: '100%',
  },
});
