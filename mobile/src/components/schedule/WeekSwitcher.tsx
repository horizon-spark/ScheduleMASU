// src/components/schedule/WeekSwitcher.tsx
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatWeekRange, getWeekParity } from "../../constants/schedule";

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
        <Ionicons name="chevron-back" size={22} color="#0055A5" />
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
            color="#666"
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
        <Ionicons name="chevron-forward" size={22} color="#0055A5" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  arrow: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  pressed: { opacity: 0.6 },
  center: { flex: 1, alignItems: "center" },
  rangeButton: { flexDirection: "row", alignItems: "center" },
  range: { fontSize: 16, fontWeight: "600", color: "#333", flexShrink: 1 },
  rangeChevron: { marginLeft: 4 },
  hint: { fontSize: 12, color: "#888", marginTop: 2 },
  today: { color: "#0055A5", fontWeight: "600" },
});
