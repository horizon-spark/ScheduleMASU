// src/components/schedule/DayPage.tsx
import { Ionicons } from "@expo/vector-icons";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Lesson } from "../../api/types";
import { formatUpdateTime } from "../../constants/schedule";
import { colors, fonts, spacing, typography } from "../../constants/theme";
import type { ScheduleSubjectKind } from "../../types/schedule";
import { LessonCard } from "./LessonCard";

type Props = {
  lessons: Lesson[];
  subjectKind: ScheduleSubjectKind;
  refreshing: boolean;
  onRefresh: () => void;
  update?: string | null;
};

export function DayPage({
  lessons,
  subjectKind,
  refreshing,
  onRefresh,
  update,
}: Props) {
  return (
    <View style={styles.page}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          lessons.length === 0 && styles.emptyContent,
        ]}
        showsVerticalScrollIndicator
        alwaysBounceVertical
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {lessons.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons
              name="calendar-outline"
              size={34}
              color={colors.textMuted}
            />
            <Text style={styles.emptyTitle}>В этот день занятий нет</Text>
            <Text style={styles.emptyHint}>
              Выберите другой день или обновите расписание
            </Text>
          </View>
        ) : (
          lessons.map((item, index) => (
            // index в ключе — fallback: в Lesson нет гарантированного id,
            // а пары в один день могут совпадать по date/slot/disciplines
            <LessonCard
              key={`${item.date}-${item.slot}-${item.disciplines}-${index}`}
              item={item}
              subjectKind={subjectKind}
            />
          ))
        )}

        {update ? (
          <Text style={styles.updated}>
            Данные на {formatUpdateTime(update)}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.lg },
  emptyContent: { flexGrow: 1, justifyContent: "center" },
  empty: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.bodyStrong,
    color: colors.text,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  emptyHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: "center",
    maxWidth: 260,
  },
  updated: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
});
