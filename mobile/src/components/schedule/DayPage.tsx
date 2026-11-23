// src/components/schedule/DayPage.tsx
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Lesson } from "../../api/types";
import { formatUpdateTime } from "../../constants/schedule";
import { colors, spacing } from "../../constants/theme";
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
          <Text style={styles.emptyText}>Занятий нет</Text>
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
  emptyText: {
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 14,
  },
  updated: {
    textAlign: "center",
    color: "#AAAAAA",
    fontSize: 11,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
});
