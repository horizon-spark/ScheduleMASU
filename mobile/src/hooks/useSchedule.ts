// src/hooks/useSchedule.ts
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { getSchedule } from "../api/schedule";
import type { Group, Lesson } from "../api/types";
import {
  addDays,
  getDayIndex,
  getMondayOfWeek,
  getWeekRange,
  isSameDay,
  WEEKDAYS_COUNT,
} from "../constants/schedule";
import {
  isScheduleCacheFresh,
  makeScheduleCacheKey,
  readScheduleCache,
  writeScheduleCache,
} from "../utils/scheduleCache";
import type { CachedSchedule } from "../utils/scheduleCache";
import { getSelectedGroup } from "../utils/storage";

type PagerRef = React.RefObject<{ setPage: (i: number) => void } | null>;

export function useSchedule(pagerRef: PagerRef) {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(() =>
    getMondayOfWeek(new Date()),
  );
  const [schedule, setSchedule] = useState<Lesson[]>([]);
  const [update, setUpdate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isWeekLoading, setIsWeekLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  const initialPageRef = useRef(0);
  const selectedGroupRef = useRef<Group | null>(null);
  const weekStartRef = useRef<Date>(weekStart);
  const hasResolvedRef = useRef(false);
  const isFocusedRef = useRef(false);
  const requestSeq = useRef(0);
  const inFlightCountRef = useRef(0);

  useEffect(() => {
    selectedGroupRef.current = selectedGroup;
  }, [selectedGroup]);

  useEffect(() => {
    weekStartRef.current = weekStart;
  }, [weekStart]);

  const finishInitialLoading = useCallback(() => {
    if (!hasResolvedRef.current) {
      hasResolvedRef.current = true;
      setIsInitialLoading(false);
    }
  }, []);

  /**
   * Загружает неделю по стратегии stale-while-revalidate:
   * свежий кеш — сразу, устаревший — сразу и тихо обновляем,
   * без кеша — спиннер и запрос. `force` — pull-to-refresh (мимо кеша прокси).
   */
  const loadWeek = useCallback(
    async (
      uid: string,
      start: Date,
      options: { force?: boolean; revalidate?: boolean } = {},
    ) => {
      // Фоновую ревалидацию не запускаем поверх уже идущего запроса:
      // иначе она может отменить ручной pull-to-refresh.
      if (options.revalidate && inFlightCountRef.current > 0) return;

      const force = options.force === true;
      const seq = ++requestSeq.current;
      const range = getWeekRange(start);
      const key = makeScheduleCacheKey(uid, range.start, range.end);

      let cached: CachedSchedule | null = null;

      if (!force) {
        cached = await readScheduleCache(key);
        if (seq !== requestSeq.current) return;

        if (cached) {
          setSchedule(cached.timetable);
          setUpdate(cached.update);
          setIsWeekLoading(false);
          setIsRefreshing(false);
          finishInitialLoading();

          if (isScheduleCacheFresh(cached)) {
            return;
          }
        }
      }

      if (!force && !cached) {
        setIsWeekLoading(true);
      }

      inFlightCountRef.current += 1;
      try {
        const res = await getSchedule(uid, range.start, range.end, {
          fresh: force,
        });
        if (seq !== requestSeq.current) return;

        const nextUpdate = res.update ?? null;
        setSchedule(res.timetable);
        setUpdate(nextUpdate);
        setError(null);

        void writeScheduleCache(key, {
          timetable: res.timetable,
          update: nextUpdate,
          fetchedAt: Date.now(),
        });
      } catch {
        if (seq !== requestSeq.current) return;
        setError("Не удалось загрузить расписание");
      } finally {
        inFlightCountRef.current = Math.max(0, inFlightCountRef.current - 1);
        if (seq === requestSeq.current) {
          setIsWeekLoading(false);
          setIsRefreshing(false);
          finishInitialLoading();
        }
      }
    },
    [finishInitialLoading],
  );

  // Чтение выбранной группы при каждом фокусе экрана
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      isFocusedRef.current = true;

      (async () => {
        let group: Group | null = null;
        try {
          group = (await getSelectedGroup()) as Group | null;
        } catch {
          group = null;
        }
        if (!isActive) return;

        const prevUid = selectedGroupRef.current?.UID ?? null;
        const nextUid = group?.UID ?? null;

        if (nextUid !== prevUid) {
          if (group) {
            const monday = getMondayOfWeek(new Date());
            weekStartRef.current = monday;
            setWeekStart(monday);

            // Воскресенье (6) → показываем субботу (5)
            const dayIndex = Math.min(
              getDayIndex(new Date()),
              WEEKDAYS_COUNT - 1,
            );
            initialPageRef.current = dayIndex;
            setCurrentPage(dayIndex);

            setSchedule([]);
            setUpdate(null);
            setError(null);
            setIsWeekLoading(true);

            // ref обновляем сразу, чтобы повторный фокус не сбросил неделю
            selectedGroupRef.current = group;
            setSelectedGroup(group);
          } else {
            selectedGroupRef.current = null;
            setSelectedGroup(null);
            setSchedule([]);
            setUpdate(null);
            setError(null);
            setIsRefreshing(false);
            setIsWeekLoading(false);
            finishInitialLoading();
          }
          return;
        }

        if (group) {
          // Группа та же — тихо проверяем актуальность текущей недели
          loadWeek(group.UID, weekStartRef.current, { revalidate: true });
        } else {
          finishInitialLoading();
        }
      })();

      return () => {
        isActive = false;
        isFocusedRef.current = false;
      };
    }, [finishInitialLoading, loadWeek]),
  );

  // Загрузка при смене группы или недели
  const selectedUid = selectedGroup?.UID ?? null;
  useEffect(() => {
    if (!selectedUid) return;
    loadWeek(selectedUid, weekStart);
  }, [selectedUid, weekStart, loadWeek]);

  // Возврат из фона: обновляем, если данные устарели
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" || !isFocusedRef.current) return;
      const group = selectedGroupRef.current;
      if (!group) return;
      loadWeek(group.UID, weekStartRef.current, { revalidate: true });
    });

    return () => subscription.remove();
  }, [loadWeek]);

  // Синхронизация PagerView после первой загрузки/смены группы
  useEffect(() => {
    if (isInitialLoading || !selectedGroup) return;

    // requestAnimationFrame — чтобы PagerView успел смонтироваться
    const frame = requestAnimationFrame(() => {
      pagerRef.current?.setPage(initialPageRef.current);
    });

    return () => cancelAnimationFrame(frame);
  }, [isInitialLoading, selectedGroup, pagerRef]);

  const goToWeek = useCallback((next: Date) => {
    weekStartRef.current = next;
    setWeekStart(next);
    setSchedule([]);
    setUpdate(null);
    setError(null);
    setIsWeekLoading(true);
  }, []);

  const goToPrevWeek = useCallback(() => {
    goToWeek(addDays(weekStartRef.current, -7));
  }, [goToWeek]);

  const goToNextWeek = useCallback(() => {
    goToWeek(addDays(weekStartRef.current, 7));
  }, [goToWeek]);

  const goToCurrentWeek = useCallback(() => {
    const monday = getMondayOfWeek(new Date());
    if (isSameDay(monday, weekStartRef.current)) return;
    goToWeek(monday);
  }, [goToWeek]);

  const refresh = useCallback(() => {
    const group = selectedGroupRef.current;
    if (!group) return;
    setIsRefreshing(true);
    loadWeek(group.UID, weekStartRef.current, { force: true });
  }, [loadWeek]);

  const isCurrentWeek = isSameDay(weekStart, getMondayOfWeek(new Date()));

  return {
    selectedGroup,
    schedule,
    update,
    error,
    isInitialLoading,
    isWeekLoading,
    isRefreshing,
    currentPage,
    setCurrentPage,
    initialPage: initialPageRef.current,
    weekStart,
    isCurrentWeek,
    goToPrevWeek,
    goToNextWeek,
    goToCurrentWeek,
    refresh,
  };
}
