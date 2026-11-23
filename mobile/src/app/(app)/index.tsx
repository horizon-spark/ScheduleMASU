// src/app/(app)/index.tsx
import { useMemo, useRef, useState } from "react";
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
import { PeriodPickerModal } from "../../components/schedule/PeriodPickerModal";
import { ScheduleHeader } from "../../components/schedule/ScheduleHeader";
import { SubjectPickerModal } from "../../components/schedule/SubjectPickerModal";
import { WeekSwitcher } from "../../components/schedule/WeekSwitcher";
import { DAYS_RU, WEEKDAYS_COUNT } from "../../constants/schedule";
import { colors, radii, spacing } from "../../constants/theme";
import { useSchedule } from "../../hooks/useSchedule";

export default function ScheduleScreen() {
  const pagerRef = useRef<PagerView>(null);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [isPeriodPickerVisible, setIsPeriodPickerVisible] = useState(false);

  const {
    subject,
    group,
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
    goToWeekDate,
    selectSubject,
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

  const openPicker = () => setIsPickerVisible(true);

  if (isInitialLoading) {
    return (
      <View style={styles.container}>
        <ScheduleHeader />
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScheduleHeader subject={subject} onPressSubject={openPicker} />

      {subject ? (
        <>
          <WeekSwitcher
            start={weekStart}
            isCurrentWeek={isCurrentWeek}
            onPrev={goToPrevWeek}
            onNext={goToNextWeek}
            onToday={goToCurrentWeek}
            onPressRange={() => setIsPeriodPickerVisible(true)}
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
              ref={pagerRef}
              style={styles.pager}
              initialPage={initialPage}
              onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
            >
              {DAYS_RU.slice(0, WEEKDAYS_COUNT).map((day) => (
                <DayPage
                  key={day}
                  lessons={lessonsByDay.get(day) ?? []}
                  subjectKind={subject.kind}
                  refreshing={isRefreshing}
                  onRefresh={refresh}
                  update={update}
                />
              ))}
            </PagerView>

            {isWeekLoading || (isRefreshing && schedule.length === 0) ? (
              <View style={styles.overlay}>
                <ActivityIndicator size="large" color={colors.primary} />
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
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Выберите группу, преподавателя или аудиторию
          </Text>
          <Pressable
            onPress={openPicker}
            style={({ pressed }) => [
              styles.chooseButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.chooseText}>Выбрать расписание</Text>
          </Pressable>
        </View>
      )}

      <SubjectPickerModal
        visible={isPickerVisible}
        active={subject}
        group={group}
        onClose={() => setIsPickerVisible(false)}
        onSelect={(next) => {
          setIsPickerVisible(false);
          selectSubject(next);
        }}
      />

      <PeriodPickerModal
        visible={isPeriodPickerVisible}
        selectedWeek={weekStart}
        onClose={() => setIsPeriodPickerVisible(false)}
        onSelect={(week) => {
          setIsPeriodPickerVisible(false);
          goToWeekDate(week);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  pagerContainer: { flex: 1 },
  pager: { flex: 1 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 14,
  },
  chooseButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  chooseText: { color: colors.onPrimary, fontWeight: "600", fontSize: 15 },
  banner: {
    backgroundColor: colors.warningBackground,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  bannerText: { color: colors.warningText, fontSize: 12, textAlign: "center" },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 10,
    paddingHorizontal: spacing.xl,
  },
  pressed: { opacity: 0.7 },
  retryText: { color: colors.onPrimary, fontWeight: "600", fontSize: 14 },
});
