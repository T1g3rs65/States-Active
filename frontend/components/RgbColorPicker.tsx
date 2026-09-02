import { useEffect, useId, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  PanResponder,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const HERALDRY = [
  '#FFFFFF', '#F3F6FA', '#C9CDD3', '#000000', '#1A1A1A',
  '#C8102E', '#8B0000', '#E03C31', '#FF5A65',
  '#0033A0', '#002868', '#1D4ED8', '#4C6EF5',
  '#FFD100', '#F2C94C', '#C5A028', '#FCD34D',
  '#007A33', '#14532D', '#27D17A',
  '#00A3E0', '#0E7490', '#00E0C7',
  '#7C3AED', '#6B21A8', '#FB923C', '#9A3412',
];

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const c = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

function rgbToHsv(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

function hsvToRgb(h: number, s: number, v: number) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

function SliderBar({
  colors,
  t,
  onChange,
  locked,
}: {
  colors: string[];
  t: number;
  onChange: (t: number) => void;
  locked?: boolean;
}) {
  const nativeId = `rgb-slider-${useId().replace(/:/g, '')}`;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const lockedRef = useRef(!!locked);
  lockedRef.current = !!locked;
  const viewRef = useRef<View>(null);

  const applyPageX = (pageX: number) => {
    if (lockedRef.current) return;
    viewRef.current?.measureInWindow((x, _y, width) => {
      const w = width || 1;
      onChangeRef.current(clamp((pageX - x) / w, 0, 1));
    });
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !locked,
      onMoveShouldSetPanResponder: () => !locked,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => applyPageX(e.nativeEvent.pageX),
      onPanResponderMove: (e) => applyPageX(e.nativeEvent.pageX),
    })
  ).current;

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const el = document.getElementById(nativeId);
    if (!el) return;
    let down = false;
    const pos = (e: PointerEvent) => {
      if (lockedRef.current) return;
      const r = el.getBoundingClientRect();
      onChangeRef.current(clamp((e.clientX - r.left) / Math.max(1, r.width), 0, 1));
    };
    const onDown = (e: PointerEvent) => {
      if (lockedRef.current) return;
      e.preventDefault();
      down = true;
      el.setPointerCapture(e.pointerId);
      pos(e);
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      e.preventDefault();
      pos(e);
    };
    const onUp = (e: PointerEvent) => {
      down = false;
      try { el.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
  }, [nativeId]);

  return (
    <View
      ref={viewRef}
      nativeID={nativeId}
      {...pan.panHandlers}
      style={[
        styles.sliderHit,
        locked ? { opacity: 0.35 } : null,
        Platform.OS === 'web' ? ({ touchAction: locked ? 'pan-y' : 'none', userSelect: 'none', cursor: locked ? 'not-allowed' : 'pointer' } as any) : null,
      ]}
    >
      <LinearGradient colors={colors as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.sliderTrack} />
      <View style={[styles.sliderThumb, { left: `${clamp(t, 0, 1) * 100}%` }]} />
    </View>
  );
}

export default function RgbColorPicker({
  label = 'Color',
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const rgb = hexToRgb(value) || { r: 0, g: 224, b: 199 };
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
  const [draft, setDraft] = useState(value);
  const [locked, setLocked] = useState(true);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const applyHsv = (h: number, s: number, v: number) => {
    const n = hsvToRgb(h, s, v);
    const next = rgbToHex(n.r, n.g, n.b);
    onChange(next);
    setDraft(next);
  };

  const hueRgb = hsvToRgb(hsv.h, 1, 1);
  const hueHex = rgbToHex(hueRgb.r, hueRgb.g, hueRgb.b);

  return (
    <View style={styles.slot}>
      <View style={styles.slotHead}>
        <View style={[styles.slotSwatch, { backgroundColor: value }]} />
        <Text style={styles.sectionTitle}>{label}</Text>
        <TextInput
          value={draft}
          editable={!locked}
          autoCapitalize="characters"
          autoCorrect={false}
          onChangeText={(t) => {
            if (locked) return;
            const up = t.toUpperCase();
            setDraft(up);
            if (hexToRgb(up)) onChange(up.startsWith('#') ? up : `#${up}`);
          }}
          style={[styles.hexInput, locked && { opacity: 0.45 }]}
          placeholder="#RRGGBB"
          placeholderTextColor="rgba(243,246,250,0.35)"
        />
        <TouchableOpacity onPress={() => setLocked((v) => !v)} hitSlop={8} accessibilityLabel={locked ? 'Unlock color' : 'Lock color'}>
          <Ionicons name={locked ? 'lock-closed' : 'lock-open'} size={18} color={locked ? 'rgba(243,246,250,0.7)' : '#00E0C7'} />
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heraldryRow}>
        {HERALDRY.map((c) => (
          <TouchableOpacity
            key={`${label}-${c}`}
            onPress={() => { if (locked) return; onChange(c); setDraft(c); }}
            style={[styles.heraldryDot, { backgroundColor: c }, value.toUpperCase() === c && styles.heraldryDotOn]}
          />
        ))}
      </ScrollView>
      <Text style={styles.sliderLabel}>Hue</Text>
      <SliderBar
        locked={locked}
        t={hsv.h / 360}
        colors={['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000']}
        onChange={(next) => applyHsv(next * 360, hsv.s, hsv.v)}
      />
      <Text style={styles.sliderLabel}>Saturation</Text>
      <SliderBar
        locked={locked}
        t={hsv.s}
        colors={['#808080', hueHex]}
        onChange={(next) => applyHsv(hsv.h, next, hsv.v)}
      />
      <Text style={styles.sliderLabel}>Value</Text>
      <SliderBar
        locked={locked}
        t={hsv.v}
        colors={['#000000', hueHex]}
        onChange={(next) => applyHsv(hsv.h, hsv.s, next)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  slotHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  slotSwatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(243,246,250,0.70)',
  },
  hexInput: {
    marginLeft: 'auto',
    minWidth: 96,
    color: '#F3F6FA',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  heraldryRow: { gap: 8, paddingVertical: 6 },
  heraldryDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heraldryDotOn: { borderColor: '#27D17A', borderWidth: 2 },
  sliderLabel: { color: 'rgba(243,246,250,0.45)', fontSize: 11, marginTop: 4 },
  sliderHit: { height: 28, justifyContent: 'center', marginBottom: 6 },
  sliderTrack: { height: 12, borderRadius: 6 },
  sliderThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F3F6FA',
    marginLeft: -8,
    borderWidth: 1,
    borderColor: '#111',
  },
});
