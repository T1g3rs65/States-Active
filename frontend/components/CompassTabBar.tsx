import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNationStore } from '../store/nationStore';
import { leaningColor, mixIntoDark } from '../utils/politicalCompass';

const ICONS: Record<string, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap }> = {
  nation: { on: 'flag', off: 'flag-outline' },
  issues: { on: 'newspaper', off: 'newspaper-outline' },
  overview: { on: 'stats-chart', off: 'stats-chart-outline' },
  rankings: { on: 'trophy', off: 'trophy-outline' },
  advisors: { on: 'people', off: 'people-outline' },
  industry: { on: 'construct', off: 'construct-outline' },
  more: { on: 'grid', off: 'grid-outline' },
};

export default function CompassTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { nation } = useNationStore();
  const tint = leaningColor(nation);
  const wash = mixIntoDark(tint, 0.22);
  const tabs = state.routes.filter((r: any) => descriptors[r.key]?.options?.href !== null);
  const activeKey = state.routes[state.index]?.key;
  const active = Math.max(0, tabs.findIndex((r) => r.key === activeKey));

  const [slots, setSlots] = useState<{ x: number; w: number }[]>([]);
  const slide = useRef(new Animated.Value(0)).current;
  const pillW = useRef(new Animated.Value(56)).current;

  useEffect(() => {
    const slot = slots[active];
    if (!slot) return;
    Animated.spring(slide, { toValue: slot.x, useNativeDriver: false, friction: 8, tension: 80 }).start();
    Animated.spring(pillW, { toValue: slot.w, useNativeDriver: false, friction: 8, tension: 80 }).start();
  }, [active, slots]);

  const onBarLayout = (e: LayoutChangeEvent) => {
    const total = e.nativeEvent.layout.width;
    const w = total / Math.max(tabs.length, 1);
    setSlots(tabs.map((_, i) => ({ x: i * w + 3, w: w - 6 })));
  };

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8), borderTopColor: tint }]}>
      <View style={styles.bar} onLayout={onBarLayout}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pill,
            { backgroundColor: wash, borderColor: tint, left: slide, width: pillW },
          ]}
        />
        {tabs.map((route, i) => {
          const focused = i === active;
          const { options } = descriptors[route.key];
          const label = (options.title as string) || route.name;
          const icons = ICONS[route.name] || { on: 'ellipse', off: 'ellipse-outline' };
          return (
            <Pressable
              key={route.key}
              style={styles.item}
              onPress={() => {
                const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
              }}
            >
              <Ionicons name={focused ? icons.on : icons.off} size={18} color={focused ? tint : 'rgba(243,246,250,0.45)'} />
              <Text style={[styles.label, { color: focused ? tint : 'rgba(243,246,250,0.45)' }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#08090A',
    borderTopWidth: 2,
    paddingTop: 6,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    marginHorizontal: 8,
    position: 'relative',
  },
  pill: {
    position: 'absolute',
    top: 4,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    zIndex: 1,
    height: 52,
  },
  label: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
