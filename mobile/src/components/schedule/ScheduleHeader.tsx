// src/components/schedule/ScheduleHeader.tsx
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "../../constants/theme";
import type { ScheduleSubject } from "../../types/schedule";

type Props = {
  /** undefined — не показывать строку субъекта (начальная загрузка). */
  subject?: ScheduleSubject | null;
  onPressSubject?: () => void;
};

export function ScheduleHeader({ subject, onPressSubject }: Props) {
  const insets = useSafeAreaInsets();
  const title = subject?.title ?? "Выбрать расписание";
  // Направление/роль не дублируем в шапке: у группы остаётся только код.
  // Подпись показываем лишь для аудитории — там это корпус.
  const subtitle = subject?.kind === "room" ? subject.subtitle : undefined;

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      {subject !== undefined ? (
        <Pressable
          onPress={onPressSubject}
          disabled={!onPressSubject}
          accessibilityRole="button"
          accessibilityLabel="Выбрать расписание"
          style={({ pressed }) => [styles.subject, pressed && styles.pressed]}
        >
          <View style={styles.text}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {onPressSubject ? (
            <Ionicons
              name="chevron-down"
              size={20}
              color={colors.onPrimaryMuted}
            />
          ) : null}
        </Pressable>
      ) : (
        <Text style={styles.title} numberOfLines={1}>
          Расписание
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  subject: { flexDirection: "row", alignItems: "center" },
  text: { flex: 1, paddingRight: spacing.sm },
  title: { color: colors.onPrimary, fontSize: 20, fontWeight: "700" },
  subtitle: { color: colors.onPrimaryMuted, fontSize: 12, marginTop: 2 },
  pressed: { opacity: 0.7 },
});
