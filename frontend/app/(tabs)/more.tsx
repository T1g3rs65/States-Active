import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../../utils/theme';

interface MenuItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const MENU_ITEMS: MenuItem[] = [
  { label: 'Statistics', icon: 'stats-chart', route: '/(tabs)/overview' },
  { label: 'Advisors', icon: 'people', route: '/(tabs)/advisors' },
  { label: 'Industry', icon: 'construct', route: '/(tabs)/industry' },
  { label: 'World Map', icon: 'globe', route: '/world-map' },
];

export default function More() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
      </View>
      <ScrollView contentContainerStyle={styles.menu}>
        {MENU_ITEMS.map(item => (
          <TouchableOpacity
            key={item.route}
            style={styles.row}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
          >
            <Ionicons name={item.icon} size={22} color={colors.accent.primary} />
            <Text style={styles.rowText}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surfaceSolid,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  title: {
    ...typography.title,
    color: colors.text.primary,
  },
  menu: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.glass.base,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: radii.md,
  },
  rowText: {
    ...typography.body,
    flex: 1,
    color: colors.text.primary,
  },
});
