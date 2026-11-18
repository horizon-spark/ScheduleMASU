// src/components/schedule/DayPage.tsx
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Lesson } from "../../api/types";
import { LessonCard } from "./LessonCard";

type Props = {
  dayTitle: string;
  lessons: Lesson[];
};

export function DayPage({ dayTitle, lessons }: Props) {
  return (
    <View style={styles.page}>
      <Text style={styles.dayTitle}>{dayTitle}</Text>
      {lessons.length === 0 ? (
        <Text style={styles.emptyText}>Занятий нет</Text>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
        >
          {lessons.map((item, index) => (
            // index в ключе — fallback: в Lesson нет гарантированного id,
            // а пары в один день могут совпадать по date/slot/disciplines
            <LessonCard
              key={`${item.date}-${item.slot}-${item.disciplines}-${index}`}
              item={item}
            />
          ))}
        </ScrollView>
      )}
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
  emptyText: {
    textAlign: "center",
    color: "#888",
    fontSize: 14,
    marginTop: 20,
  },
});
