// src/components/schedule/DayPage.tsx
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Lesson } from "../../api/types";
import type { ScheduleSubjectKind } from "../../types/schedule";
import { LessonCard } from "./LessonCard";

type Props = {
  dayTitle: string;
  lessons: Lesson[];
  subjectKind: ScheduleSubjectKind;
  refreshing: boolean;
  onRefresh: () => void;
};

export function DayPage({
  dayTitle,
  lessons,
  subjectKind,
  refreshing,
  onRefresh,
}: Props) {
  return (
    <View style={styles.page}>
      <Text style={styles.dayTitle}>{dayTitle}</Text>
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
            tintColor="#0055A5"
            colors={["#0055A5"]}
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 15 },
  dayTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
    textAlign: "center",
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  emptyContent: { flexGrow: 1, justifyContent: "center" },
  emptyText: {
    textAlign: "center",
    color: "#888",
    fontSize: 14,
  },
});
