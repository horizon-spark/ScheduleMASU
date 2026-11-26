// src/components/schedule/LessonCard.tsx
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import type { Lesson } from "../../api/types";
import {
  colors,
  radii,
  shadows,
  spacing,
  typography,
} from "../../constants/theme";
import type { ScheduleSubjectKind } from "../../types/schedule";

function splitSlot(slot: unknown): { start: string; end?: string } {
  const value = typeof slot === "string" ? slot : "";
  const [start, end] = value.split(" - ");
  return { start: start?.trim() || value, end: end?.trim() };
}

type Tone = { background: string; foreground: string };

function getTypeTone(type: string): Tone {
  const normalized = type.toLowerCase();

  if (normalized.includes("лекц")) {
    return { background: colors.primarySoft, foreground: colors.primary };
  }
  if (normalized.includes("практ")) {
    return { background: colors.successSoft, foreground: colors.success };
  }
  if (normalized.includes("лаб")) {
    return { background: colors.accentSoft, foreground: colors.accent };
  }
  if (normalized.includes("экзам") || normalized.includes("зач")) {
    return { background: colors.dangerSoft, foreground: colors.danger };
  }

  return { background: colors.surfaceMuted, foreground: colors.textSecondary };
}

type Props = {
  item: Lesson;
  subjectKind: ScheduleSubjectKind;
};

export function LessonCard({ item, subjectKind }: Props) {
  const { start, end } = splitSlot(item.slot);
  const subGroups = Array.isArray(item.subGroups) ? item.subGroups : [];
  const tone = item.type
    ? getTypeTone(item.type)
    : { background: colors.surfaceMuted, foreground: colors.primary };

  return (
    <View style={styles.row}>
      <View style={styles.timeColumn}>
        <Text style={styles.startTime}>{start}</Text>
        {end ? <Text style={styles.endTime}>{end}</Text> : null}
      </View>

      <View style={[styles.card, { borderLeftColor: tone.foreground }]}>
        <Text style={styles.subject} numberOfLines={2}>
          {item.disciplines}
        </Text>

        <View style={styles.metaRow}>
          {item.type ? (
            <View
              style={[styles.typeBadge, { backgroundColor: tone.background }]}
            >
              <Text style={[styles.typeText, { color: tone.foreground }]}>
                {item.type}
              </Text>
            </View>
          ) : null}

          {subjectKind !== "room" && item.room ? (
            <Text style={styles.meta} numberOfLines={1}>
              {item.room}
            </Text>
          ) : null}
        </View>

        {subjectKind !== "teacher" && item.teacher ? (
          <Text style={styles.teacher} numberOfLines={1}>
            {item.teacher}
          </Text>
        ) : null}

        {subGroups.length > 0 ? (
          <View style={styles.groupsChip}>
            <Ionicons
              name="people-outline"
              size={13}
              color={colors.primary}
            />
            <Text style={styles.groups} numberOfLines={2}>
              {subjectKind === "group" ? "Подгруппы" : "Группы"}:{" "}
              {subGroups.join(", ")}
            </Text>
          </View>
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
    width: 56,
    alignItems: "center",
    paddingTop: spacing.sm,
  },
  startTime: {
    ...typography.bodyStrong,
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  endTime: {
    ...typography.micro,
    color: colors.textMuted,
    fontWeight: "500",
    marginTop: 3,
    fontVariant: ["tabular-nums"],
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderLeftWidth: 3,
    padding: spacing.md,
    marginLeft: spacing.sm,
    ...shadows.card,
  },
  subject: {
    ...typography.bodyStrong,
    color: colors.text,
    marginBottom: 5,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  typeBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  typeText: {
    ...typography.micro,
    fontWeight: "600",
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  teacher: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  groupsChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginTop: spacing.sm,
  },
  groups: {
    ...typography.micro,
    color: colors.primary,
    fontWeight: "500",
    flexShrink: 1,
  },
});
