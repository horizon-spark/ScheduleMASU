// src/app/(app)/index.tsx
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import PagerView from "react-native-pager-view";
import { getSchedule } from "../../api/schedule";
import { Group, Lesson } from "../../api/types";
import { getSelectedGroup } from "../../utils/storage";

const DAYS_RU = [
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
  "Воскресенье",
];
const DAYS_SHORT = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

export default function ScheduleScreen() {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [schedule, setSchedule] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const pagerRef = useRef<PagerView>(null);
  const initialPageRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const load = async () => {
        try {
          const group = await getSelectedGroup();
          if (!isActive) return;

          setSelectedGroup(group);

          if (group) {
            setIsLoading(true);
            const today = new Date();
            const monday = new Date(today);
            monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
            const start = monday.toISOString().split("T")[0];
            const end = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0];

            const res = await getSchedule(group.UID, start, end);
            if (!isActive) return;

            setSchedule(res.timetable);

            const dayIndex = (today.getDay() + 6) % 7;
            const safeIndex = Math.min(dayIndex, 5);
            initialPageRef.current = safeIndex;
            setCurrentPage(safeIndex);
          } else {
            setSchedule([]);
          }
        } catch (e) {
          console.error(e);
        } finally {
          if (isActive) setIsLoading(false);
        }
      };

      load();

      return () => {
        isActive = false;
      };
    }, []),
  );

  useEffect(() => {
    if (isLoading || !selectedGroup) return;
    const idx = initialPageRef.current;
    requestAnimationFrame(() => pagerRef.current?.setPage(idx));
  }, [isLoading, selectedGroup]);

  const getLessonsForDay = (dayIndex: number) => {
    const dayName = DAYS_RU[dayIndex];
    return schedule.filter((item) => item.day_of_week === dayName);
  };

  if (isLoading && schedule.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Расписание</Text>
        </View>
        <ActivityIndicator size="large" color="#0055A5" style={{ flex: 1 }} />
      </View>
    );
  }

  if (!selectedGroup) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Расписание</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Сначала выберите группу в профиле
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Расписание</Text>
        <Text style={styles.groupLabel}>{selectedGroup.group}</Text>
      </View>

      <View style={styles.daysContainer}>
        {DAYS_SHORT.slice(0, 6).map((day, i) => (
          <Pressable
            key={day}
            style={({ pressed }) => [
              styles.dayTab,
              currentPage === i && styles.dayTabActive,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => {
              pagerRef.current?.setPage(i);
            }}
          >
            <Text
              style={[
                styles.dayTabText,
                currentPage === i && styles.dayTabTextActive,
              ]}
            >
              {day}
            </Text>
          </Pressable>
        ))}
      </View>

      <PagerView
        key={selectedGroup.UID}
        ref={pagerRef}
        style={styles.pager}
        initialPage={initialPageRef.current}
        onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
      >
        {DAYS_RU.slice(0, 6).map((day, dayIndex) => {
          const lessons = getLessonsForDay(dayIndex);
          return (
            <View key={day} style={styles.page}>
              <Text style={styles.dayTitle}>{day}</Text>
              {lessons.length === 0 ? (
                <Text style={styles.emptyText}>Занятий нет</Text>
              ) : (
                <ScrollView
                  style={styles.scroll}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={true}
                >
                  {lessons.map((item, index) => (
                    <View
                      key={`${item.date}-${item.slot}-${item.disciplines}-${index}`}
                      style={styles.scheduleItem}
                    >
                      <View style={styles.timeColumn}>
                        <Text style={styles.startTime}>
                          {item.slot.split(" - ")[0]}
                        </Text>
                        <Text style={styles.endTime}>
                          {item.slot.split(" - ")[1]}
                        </Text>
                      </View>
                      <View style={styles.card}>
                        <Text style={styles.subject}>{item.disciplines}</Text>
                        <Text style={styles.detail}>{item.type}</Text>
                        <Text style={styles.detail}>{item.room}</Text>
                        <Text style={styles.teacher}>{item.teacher}</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          );
        })}
      </PagerView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    backgroundColor: "#0055A5",
    padding: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "bold" },
  groupLabel: { color: "rgba(255,255,255,0.8)", fontSize: 14, marginTop: 5 },
  daysContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "white",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  dayTab: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 20 },
  dayTabActive: { backgroundColor: "#0055A5" },
  dayTabText: { fontSize: 14, fontWeight: "bold", color: "#333" },
  dayTabTextActive: { color: "white" },
  pager: { flex: 1 },
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
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: {
    textAlign: "center",
    color: "#888",
    fontSize: 14,
    marginTop: 20,
  },
  scheduleItem: { flexDirection: "row", marginBottom: 15 },
  timeColumn: { width: 60, alignItems: "center", paddingTop: 10 },
  startTime: { fontSize: 16, fontWeight: "bold", color: "#333" },
  endTime: { fontSize: 14, color: "#F28C28", marginTop: 5 },
  card: {
    flex: 1,
    backgroundColor: "#0055A5",
    borderRadius: 15,
    padding: 15,
    marginLeft: 10,
  },
  subject: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  detail: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginBottom: 3 },
  teacher: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontStyle: "italic",
  },
});
