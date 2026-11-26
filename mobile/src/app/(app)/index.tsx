// src/app/(app)/index.tsx
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import PagerView from "react-native-pager-view";
import { DayPage } from "../../components/schedule/DayPage";
import { DayTabs } from "../../components/schedule/DayTabs";
import { PeriodPickerModal } from "../../components/schedule/PeriodPickerModal";
import { ScheduleHeader } from "../../components/schedule/ScheduleHeader";
import { ScheduleSkeleton } from "../../components/schedule/ScheduleSkeleton";
import { SubjectPickerModal } from "../../components/schedule/SubjectPickerModal";
import { WeekSwitcher } from "../../components/schedule/WeekSwitcher";
import {
  DAYS_RU,
  formatUpdateTime,
  WEEKDAYS_COUNT,
} from "../../constants/schedule";
import { colors, radii, spacing, typography } from "../../constants/theme";
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
    goToPrevWeek,
    goToNextWeek,
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
        <ScheduleSkeleton />
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
            onPrev={goToPrevWeek}
            onNext={goToNextWeek}
            onPressRange={() => setIsPeriodPickerVisible(true)}
          />

          <DayTabs
            weekStart={weekStart}
            currentPage={currentPage}
            onSelect={(i) => pagerRef.current?.setPage(i)}
          />

          {error && schedule.length > 0 ? (
            <View style={styles.banner}>
              <Ionicons
                name="cloud-offline-outline"
                size={15}
                color={colors.warningText}
              />
              <Text style={styles.bannerText}>
                Нет связи.{" "}
                {update
                  ? `Данные на ${formatUpdateTime(update)}`
                  : "Показаны сохранённые данные"}
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
              <View style={styles.loadingOverlay}>
                <ScheduleSkeleton />
              </View>
            ) : null}

            {!isWeekLoading && !isRefreshing && error && schedule.length === 0 ? (
              <View style={styles.overlay}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={38}
                  color={colors.textMuted}
                />
                <Text style={styles.errorTitle}>Не удалось загрузить</Text>
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
          <View style={styles.emptyIcon}>
            <Ionicons
              name="calendar-outline"
              size={38}
              color={colors.primary}
            />
          </View>
          <Text style={styles.emptyTitle}>Расписание пока не выбрано</Text>
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

      {isPickerVisible ? (
        <SubjectPickerModal
          visible
          active={subject}
          group={group}
          onClose={() => setIsPickerVisible(false)}
          onSelect={(next) => {
            setIsPickerVisible(false);
            selectSubject(next);
          }}
        />
      ) : null}

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
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.headline,
    color: colors.text,
    textAlign: "center",
  },
  emptyText: {
    ...typography.caption,
    textAlign: "center",
    color: colors.textMuted,
    marginTop: spacing.xs,
    maxWidth: 280,
  },
  chooseButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 44,
    justifyContent: "center",
  },
  chooseText: {
    ...typography.bodyStrong,
    color: colors.onPrimary,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.warningBackground,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  bannerText: {
    ...typography.caption,
    color: colors.warningText,
    flexShrink: 1,
  },
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
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    paddingTop: spacing.sm,
  },
  errorTitle: {
    ...typography.headline,
    color: colors.text,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 44,
    justifyContent: "center",
  },
  pressed: { opacity: 0.7 },
  retryText: {
    ...typography.bodyStrong,
    color: colors.onPrimary,
  },
});
