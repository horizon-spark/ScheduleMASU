// src/components/schedule/ScheduleHeader.tsx
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatUpdateTime } from "../../constants/schedule";
import type { ScheduleSubject } from "../../types/schedule";

type Props = {
  /** undefined — не показывать строку субъекта (начальная загрузка). */
  subject?: ScheduleSubject | null;
  onPressSubject?: () => void;
  update?: string | null;
};

export function ScheduleHeader({ subject, onPressSubject, update }: Props) {
  const title = subject?.title ?? "Выбрать расписание";
  const subtitle = subject?.subtitle;

  return (
    <View style={styles.header}>
      <Text style={styles.title}>Расписание</Text>

      {subject !== undefined ? (
        <Pressable
          onPress={onPressSubject}
          disabled={!onPressSubject}
          accessibilityRole="button"
          accessibilityLabel="Выбрать расписание"
          style={({ pressed }) => [styles.subject, pressed && styles.pressed]}
        >
          <View style={styles.subjectText}>
            <Text style={styles.subjectTitle} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subjectSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {onPressSubject ? (
            <Ionicons
              name="chevron-down"
              size={18}
              color="rgba(255,255,255,0.85)"
            />
          ) : null}
        </Pressable>
      ) : null}

      {update ? (
        <Text style={styles.update}>
          Обновлено: {formatUpdateTime(update)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#0055A5",
    padding: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  title: { color: "white", fontSize: 20, fontWeight: "bold" },
  subject: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  subjectText: { flex: 1, paddingRight: 8 },
  subjectTitle: { color: "white", fontSize: 17, fontWeight: "600" },
  subjectSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 2,
  },
  pressed: { opacity: 0.7 },
  update: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 6 },
});
