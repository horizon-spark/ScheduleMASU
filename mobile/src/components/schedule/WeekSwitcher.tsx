// src/components/schedule/WeekSwitcher.tsx
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatWeekRange, getWeekParity } from "../../constants/schedule";
import { colors, spacing } from "../../constants/theme";

type Props = {
  start: Date;
  isCurrentWeek: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onPressRange: () => void;
};

export function WeekSwitcher({
  start,
  isCurrentWeek,
  onPrev,
  onNext,
  onToday,
  onPressRange,
}: Props) {
  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPrev}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Предыдущая неделя"
        style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
      >
        <Ionicons name="chevron-back" size={20} color={colors.primary} />
      </Pressable>

      <View style={styles.center}>
        <Pressable
          onPress={onPressRange}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Выбрать период"
          style={({ pressed }) => [
            styles.rangeButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.range} numberOfLines={1}>
            {formatWeekRange(start)} · {getWeekParity(start)}
          </Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={colors.textMuted}
            style={styles.rangeChevron}
          />
        </Pressable>
        {isCurrentWeek ? (
          <Text style={styles.hint}>Текущая неделя</Text>
        ) : (
          <Pressable
            onPress={onToday}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Перейти к текущей неделе"
          >
            <Text style={[styles.hint, styles.today]}>К текущей неделе</Text>
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={onNext}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Следующая неделя"
        style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
      >
        <Ionicons name="chevron-forward" size={20} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  arrow: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  pressed: { opacity: 0.6 },
  center: { flex: 1, alignItems: "center" },
  rangeButton: { flexDirection: "row", alignItems: "center" },
  range: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    flexShrink: 1,
  },
  rangeChevron: { marginLeft: spacing.xs },
  hint: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  today: { color: colors.primary, fontWeight: "600" },
});
