// src/components/schedule/DayTabs.tsx
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  addDays,
  DAYS_RU,
  DAYS_SHORT,
  isSameDay,
  WEEKDAYS_COUNT,
} from "../../constants/schedule";
import { colors, spacing } from "../../constants/theme";

type Props = {
  weekStart: Date;
  currentPage: number;
  onSelect: (index: number) => void;
};

export function DayTabs({ weekStart, currentPage, onSelect }: Props) {
  const today = new Date();

  return (
    <View style={styles.container}>
      {DAYS_SHORT.slice(0, WEEKDAYS_COUNT).map((label, index) => {
        const date = addDays(weekStart, index);
        const selected = currentPage === index;
        const isToday = isSameDay(date, today);
        const todaySelected = isToday && !selected;

        return (
          <Pressable
            key={label}
            onPress={() => onSelect(index)}
            accessibilityRole="button"
            accessibilityLabel={`${DAYS_RU[index]}, ${date.getDate()}`}
            accessibilityState={{ selected }}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <Text
              style={[
                styles.weekday,
                (selected || isToday) && styles.weekdaySelected,
              ]}
            >
              {label}
            </Text>
            <View
              style={[
                styles.dayCircle,
                selected && styles.dayCircleSelected,
                todaySelected && styles.dayCircleToday,
              ]}
            >
              <Text
                style={[
                  styles.dayNumber,
                  isToday && !selected && styles.dayNumberToday,
                  selected && styles.dayNumberSelected,
                ]}
              >
                {date.getDate()}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 2,
  },
  pressed: { opacity: 0.7 },
  weekday: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  weekdaySelected: { color: colors.primary },
  dayCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginTop: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleSelected: { backgroundColor: colors.primary },
  dayCircleToday: { borderWidth: 1, borderColor: colors.primary },
  dayNumber: { fontSize: 15, fontWeight: "700", color: colors.text },
  dayNumberToday: { color: colors.primary },
  dayNumberSelected: { color: colors.onPrimary },
});
