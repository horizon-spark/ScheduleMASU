// src/app/(app)/index.tsx
import { useMemo, useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import PagerView from "react-native-pager-view";
import { DayPage } from "../../components/schedule/DayPage";
import { DayTabs } from "../../components/schedule/DayTabs";
import { ScheduleHeader } from "../../components/schedule/ScheduleHeader";
import { DAYS_RU, WEEKDAYS_COUNT } from "../../constants/schedule";
import { useSchedule } from "../../hooks/useSchedule";

export default function ScheduleScreen() {
  const pagerRef = useRef<PagerView>(null);
  const {
    selectedGroup,
    schedule,
    isInitialLoading,
    currentPage,
    setCurrentPage,
    initialPage,
  } = useSchedule(pagerRef);

  // Группируем расписание по дню один раз на изменение schedule
  const lessonsByDay = useMemo(() => {
    const map = new Map<string, typeof schedule>();
    for (const item of schedule) {
      const list = map.get(item.day_of_week) ?? [];
      list.push(item);
      map.set(item.day_of_week, list);
    }
    return map;
  }, [schedule]);

  if (isInitialLoading) {
    return (
      <View style={styles.container}>
        <ScheduleHeader />
        <ActivityIndicator size="large" color="#0055A5" style={{ flex: 1 }} />
      </View>
    );
  }

  if (!selectedGroup) {
    return (
      <View style={styles.container}>
        <ScheduleHeader />
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
      <ScheduleHeader groupName={selectedGroup.group} />

      <DayTabs
        currentPage={currentPage}
        onSelect={(i) => pagerRef.current?.setPage(i)}
      />

      <PagerView
        key={selectedGroup.UID}
        ref={pagerRef}
        style={styles.pager}
        initialPage={initialPage}
        onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
      >
        {DAYS_RU.slice(0, WEEKDAYS_COUNT).map((day) => (
          <DayPage
            key={day}
            dayTitle={day}
            lessons={lessonsByDay.get(day) ?? []}
          />
        ))}
      </PagerView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  pager: { flex: 1 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: {
    textAlign: "center",
    color: "#888",
    fontSize: 14,
    marginTop: 20,
  },
});
