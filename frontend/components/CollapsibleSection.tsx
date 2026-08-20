import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../utils/theme';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  initiallyOpen?: boolean;
}

export default function CollapsibleSection({
  title,
  children,
  initiallyOpen = false,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(initiallyOpen);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.7}
      >
        <Text style={styles.title}>{title}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.text.secondary}
        />
      </TouchableOpacity>
      {open && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    backgroundColor: colors.glass.base,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.headline,
    color: colors.text.primary,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
});
