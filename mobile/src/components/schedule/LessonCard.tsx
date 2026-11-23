// src/components/schedule/LessonCard.tsx
import { StyleSheet, Text, View } from "react-native";
import { Lesson } from "../../api/types";
import { colors, radii, spacing } from "../../constants/theme";
import type { ScheduleSubjectKind } from "../../types/schedule";

function splitSlot(slot: string): { start: string; end?: string } {
  const [start, end] = slot.split(" - ");
  return { start: start?.trim() ?? slot, end: end?.trim() };
}

type Props = {
  item: Lesson;
  subjectKind: ScheduleSubjectKind;
};

export function LessonCard({ item, subjectKind }: Props) {
  const { start, end } = splitSlot(item.slot);

  // В расписании аудитории сама аудитория — уже заголовок, не дублируем
  const meta = [
    subjectKind !== "room" ? item.room : null,
    item.type,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={styles.row}>
      <View style={styles.timeColumn}>
        <Text style={styles.startTime}>{start}</Text>
        {end ? <Text style={styles.endTime}>{end}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.subject} numberOfLines={2}>
          {item.disciplines}
        </Text>

        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}

        {subjectKind !== "teacher" ? (
          <Text style={styles.teacher} numberOfLines={1}>
            {item.teacher}
          </Text>
        ) : null}

        {item.subGroups.length > 0 ? (
          <Text style={styles.groups} numberOfLines={2}>
            {subjectKind === "group" ? "Подгруппы" : "Группы"}:{" "}
            {item.subGroups.join(", ")}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginBottom: spacing.sm + 2,
  },
  timeColumn: {
    width: 52,
    alignItems: "center",
    paddingTop: spacing.sm,
  },
  startTime: { fontSize: 15, fontWeight: "700", color: colors.text },
  endTime: { fontSize: 12, color: colors.accent, marginTop: 4 },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    padding: spacing.md,
    marginLeft: spacing.sm + 2,
  },
  subject: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 3,
  },
  meta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  teacher: { fontSize: 12, color: colors.textMuted },
  groups: {
    fontSize: 11,
    color: colors.primary,
    marginTop: spacing.xs,
  },
});
