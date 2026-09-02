import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNationStore } from '../store/nationStore';
import ScreenHeader from '../components/ScreenHeader';
import ScreenCanvas from '../components/ScreenCanvas';
import LiquidGlass from '../components/LiquidGlass';
import {
  compassPosition,
  compassColor,
  getPoliticalCompassTheme,
} from '../utils/politicalCompass';

const SIZE = 320;
const CELL = SIZE / 3;

const GRID_LAYOUT: { label: string }[][] = [
  [{ label: 'Communist' }, { label: 'Authoritarian' }, { label: 'Conservative' }],
  [{ label: 'Socialist' }, { label: 'Centrist' }, { label: 'Corporatist' }],
  [{ label: 'Eco-Left' }, { label: 'Liberal' }, { label: 'Libertarian' }],
];

export default function CompassScreen() {
  const router = useRouter();
  const { nation } = useNationStore();
  const stats = nation?.stats;
  const govType = nation?.government_subtype || null;
  const pos = compassPosition(stats);
  const px = ((pos.x + 1) / 2) * SIZE;
  const py = ((1 - pos.y) / 2) * SIZE;

  const theme = getPoliticalCompassTheme(
    stats?.civil_rights ?? 50,
    stats?.gdp ?? 50,
    stats?.political_freedom ?? 50,
  );
  const markerColor = compassColor(stats);

  const axisPct = Math.round(((pos.x + 1) / 2) * 100);
  const libPct = Math.round(((pos.y + 1) / 2) * 100);

  return (
    <ScreenCanvas>
      <View style={styles.container}>
        <ScreenHeader title="Political Compass" subtitle="Where your nation sits" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.blurb}>
            Left–right: economic freedom (GDP). Top–bottom: authority vs liberty (civil rights + political freedom).
            Color blends continuously across the chart.
          </Text>

          <View style={styles.gridWrap}>
            <View style={styles.grid}>
              <Image
                source={require('../assets/images/compass-grid.png')}
                style={styles.gridBg}
                resizeMode="cover"
              />
              {GRID_LAYOUT.map((row, ri) =>
                row.map((cell, ci) => (
                  <View
                    key={`${ri}-${ci}`}
                    style={[styles.gridCell, { left: ci * CELL, top: ri * CELL }]}
                    pointerEvents="none"
                  >
                    <Text style={styles.gridCellLabel}>{cell.label}</Text>
                  </View>
                )),
              )}

              <View style={[styles.vLine, { left: CELL }]} />
              <View style={[styles.vLine, { left: CELL * 2 }]} />
              <View style={[styles.hLine, { top: CELL }]} />
              <View style={[styles.hLine, { top: CELL * 2 }]} />

              <View style={[styles.marker, { left: px - 17, top: py - 17 }]}>
                <Ionicons name="star" size={34} color="#fff" />
                <View style={[styles.markerCore, { backgroundColor: markerColor }]} />
              </View>
            </View>

            <Text style={styles.axisLabelLeft}>← Left</Text>
            <Text style={styles.axisLabelRight}>Right →</Text>
            <Text style={styles.axisLabelTop}>Authoritarian ↑</Text>
            <Text style={styles.axisLabelBottom}>↓ Libertarian</Text>
          </View>

          <LiquidGlass radius={20} style={styles.resultCard}>
            <Text style={[styles.resultName, { color: markerColor }]}>{theme.name}</Text>
            {govType ? <Text style={styles.resultGov}>{govType}</Text> : null}
            <Text style={styles.resultDesc}>{theme.description}</Text>
            <Text style={styles.resultStats}>
              Economic: {axisPct}%  ·  Liberty: {libPct}%
            </Text>
          </LiquidGlass>

          <Text style={styles.footnote}>
            Red = communist · Magenta = authoritarian · Blue = conservative · Amber = socialist · Gray = centrist · Teal = corporatist · Green = eco-left · Olive = liberal · Gold = libertarian
          </Text>
        </ScrollView>
      </View>
    </ScreenCanvas>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  body: { padding: 16, paddingBottom: 60, alignItems: 'center' },
  blurb: { color: 'rgba(243,246,250,0.6)', fontSize: 13, marginBottom: 16, lineHeight: 19, textAlign: 'center', paddingHorizontal: 12 },
  gridWrap: { alignItems: 'center', marginBottom: 24, position: 'relative', paddingHorizontal: 12 },
  grid: {
    width: SIZE,
    height: SIZE,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  gridBg: {
    ...StyleSheet.absoluteFill,
    width: SIZE,
    height: SIZE,
  },
  gridCell: {
    position: 'absolute',
    width: CELL,
    height: CELL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCellLabel: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.88)',
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  vLine: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.18)' },
  hLine: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.18)' },
  marker: { position: 'absolute', width: 34, height: 34, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  markerCore: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  axisLabelLeft: { position: 'absolute', left: -4, top: SIZE / 2 - 8, color: 'rgba(243,246,250,0.4)', fontSize: 10, fontWeight: '600' },
  axisLabelRight: { position: 'absolute', right: -4, top: SIZE / 2 - 8, color: 'rgba(243,246,250,0.4)', fontSize: 10, fontWeight: '600' },
  axisLabelTop: { position: 'absolute', top: -16, left: SIZE / 2 - 50, color: 'rgba(243,246,250,0.4)', fontSize: 10, fontWeight: '600' },
  axisLabelBottom: { position: 'absolute', bottom: -16, left: SIZE / 2 - 40, color: 'rgba(243,246,250,0.4)', fontSize: 10, fontWeight: '600' },
  resultCard: { padding: 18, alignItems: 'center', marginBottom: 12, width: '90%' },
  resultName: { fontSize: 24, fontWeight: '700', letterSpacing: -0.3 },
  resultGov: { color: 'rgba(243,246,250,0.75)', fontSize: 15, marginTop: 4, fontWeight: '600' },
  resultIdentity: { color: 'rgba(243,246,250,0.5)', fontSize: 13, marginTop: 2, fontStyle: 'italic', textAlign: 'center' },
  resultDesc: { color: 'rgba(243,246,250,0.65)', fontSize: 14, marginTop: 4, textAlign: 'center' },
  resultStats: { color: 'rgba(243,246,250,0.5)', fontSize: 12, marginTop: 10 },
  footnote: { color: 'rgba(243,246,250,0.35)', fontSize: 11, textAlign: 'center', lineHeight: 16, paddingHorizontal: 20, marginTop: 8 },
});
