// src/app/(app)/index.tsx
import { useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import PagerView from "react-native-pager-view";
import { DayPage } from "../../components/schedule/DayPage";
import { DayTabs } from "../../components/schedule/DayTabs";
import { ScheduleHeader } from "../../components/schedule/ScheduleHeader";
import { WeekSwitcher } from "../../components/schedule/WeekSwitcher";
import { DAYS_RU, WEEKDAYS_COUNT } from "../../constants/schedule";
import { useSchedule } from "../../hooks/useSchedule";

export default function ScheduleScreen() {
  const pagerRef = useRef<PagerView>(null);
  const {
    selectedGroup,
    schedule,
    update,
    error,
    isInitialLoading,
    isWeekLoading,
    isRefreshing,
    currentPage,
    setCurrentPage,
    initialPage,
    weekStart,
    isCurrentWeek,
    goToPrevWeek,
    goToNextWeek,
    goToCurrentWeek,
    refresh,
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
      <ScheduleHeader groupName={selectedGroup.group} update={update} />

      <WeekSwitcher
        start={weekStart}
        isCurrentWeek={isCurrentWeek}
        onPrev={goToPrevWeek}
        onNext={goToNextWeek}
        onToday={goToCurrentWeek}
      />

      <DayTabs
        currentPage={currentPage}
        onSelect={(i) => pagerRef.current?.setPage(i)}
      />

      {error && schedule.length > 0 ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Нет связи — показаны сохранённые данные
          </Text>
        </View>
      ) : null}

      <View style={styles.pagerContainer}>
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
              refreshing={isRefreshing}
              onRefresh={refresh}
            />
          ))}
        </PagerView>

        {isWeekLoading || (isRefreshing && schedule.length === 0) ? (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#0055A5" />
          </View>
        ) : null}

        {!isWeekLoading && !isRefreshing && error && schedule.length === 0 ? (
          <View style={styles.overlay}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              onPress={refresh}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.retryText}>Повторить</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  pagerContainer: { flex: 1 },
  pager: { flex: 1 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: {
    textAlign: "center",
    color: "#888",
    fontSize: 14,
    marginTop: 20,
  },
  banner: {
    backgroundColor: "#FFF3CD",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  bannerText: { color: "#8A6D3B", fontSize: 12, textAlign: "center" },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorText: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: "#0055A5",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  pressed: { opacity: 0.7 },
  retryText: { color: "white", fontWeight: "600", fontSize: 14 },
});
