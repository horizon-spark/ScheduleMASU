// src/hooks/useSchedule.ts
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import {
  getRoomSchedule,
  getSchedule,
  getTeacherSchedule,
} from "../api/schedule";
import type { Group, Lesson } from "../api/types";
import { useNetworkStatus } from "../context/NetworkStatusContext";
import {
  addDays,
  getDayIndex,
  getMondayOfWeek,
  getWeekRange,
  isSameDay,
  WEEKDAYS_COUNT,
} from "../constants/schedule";
import { getSubjectKey } from "../types/schedule";
import type { ScheduleSubject } from "../types/schedule";
import { describeRequestError, getErrorSummary } from "../utils/apiError";
import { resolveMainGroup } from "../utils/groups";
import {
  isScheduleCacheFresh,
  makeScheduleCacheKey,
  readScheduleCache,
  writeScheduleCache,
} from "../utils/scheduleCache";
import type { CachedSchedule } from "../utils/scheduleCache";
import {
  getSelectedGroup,
  getSelectedSubject,
  saveSelectedGroup,
  saveSelectedSubject,
} from "../utils/storage";
import { makeGroupSubject, sameSubject } from "../utils/subjects";

type PagerRef = React.RefObject<{ setPage: (i: number) => void } | null>;

function fetchSubjectSchedule(
  subject: ScheduleSubject,
  start: string,
  end: string,
  fresh: boolean,
) {
  switch (subject.kind) {
    case "group":
      return getSchedule(subject.uid, start, end, { fresh });
    case "teacher":
      return getTeacherSchedule(subject.uid, start, end, { fresh });
    case "room":
      return getRoomSchedule(subject.roomId, start, end, { fresh });
  }
}

export function useSchedule(pagerRef: PagerRef) {
  const [subject, setSubject] = useState<ScheduleSubject | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(() =>
    getMondayOfWeek(new Date()),
  );
  const [schedule, setSchedule] = useState<Lesson[]>([]);
  const [update, setUpdate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isWeekLoading, setIsWeekLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [initialPage, setInitialPage] = useState(0);
  const { isOffline } = useNetworkStatus();

  const initialPageRef = useRef(0);
  const subjectRef = useRef<ScheduleSubject | null>(null);
  const weekStartRef = useRef<Date>(weekStart);
  const hasResolvedRef = useRef(false);
  const hasPagerMountedRef = useRef(false);
  const isFocusedRef = useRef(false);
  const requestSeq = useRef(0);
  const inFlightCountRef = useRef(0);
  const isRefreshInFlightRef = useRef(false);
  const wasOfflineRef = useRef(isOffline);

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
      currentSubject: ScheduleSubject,
      start: Date,
      options: { force?: boolean; revalidate?: boolean } = {},
    ) => {
      // Фоновую ревалидацию не запускаем поверх уже идущего запроса:
      // иначе она может отменить ручной pull-to-refresh.
      if (options.revalidate && inFlightCountRef.current > 0) return;

      const force = options.force === true;
      const seq = ++requestSeq.current;
      const range = getWeekRange(start);
      const key = makeScheduleCacheKey(
        getSubjectKey(currentSubject),
        range.start,
        range.end,
      );

      let cached: CachedSchedule | null = null;

      if (!force) {
        cached = await readScheduleCache(key);
        if (seq !== requestSeq.current) return;

        if (cached) {
          setSchedule(cached.timetable);
          setUpdate(cached.update);
          setIsStale(cached.stale === true);
          setIsWeekLoading(false);
          setIsRefreshing(false);
          finishInitialLoading();

          if (isScheduleCacheFresh(cached)) {
            // Кеш свежий — запрос не нужен. Ошибка могла остаться от
            // предыдущей неудачной попытки и больше не актуальна.
            setError(null);
            return;
          }
        }
      }

      if (!force && !cached) {
        setIsWeekLoading(true);
      }

      inFlightCountRef.current += 1;
      try {
        const res = await fetchSubjectSchedule(
          currentSubject,
          range.start,
          range.end,
          force,
        );
        if (seq !== requestSeq.current) return;

        const nextUpdate = res.update ?? null;
        setSchedule(res.timetable);
        setUpdate(nextUpdate);
        setIsStale(res.stale === true);
        setError(null);

        void writeScheduleCache(key, {
          timetable: res.timetable,
          update: nextUpdate,
          fetchedAt: Date.now(),
          stale: res.stale === true,
        });
      } catch (err) {
        if (seq !== requestSeq.current) return;
        console.warn("[schedule] load failed", getErrorSummary(err));
        setError(
          describeRequestError(err, "Не удалось загрузить расписание"),
        );
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

  // Чтение активного субъекта и группы при каждом фокусе экрана
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      isFocusedRef.current = true;

      (async () => {
        let storedGroup: Group | null = null;
        let stored: ScheduleSubject | null = null;

        try {
          storedGroup = (await getSelectedGroup()) as Group | null;
        } catch {
          storedGroup = null;
        }

        // Старый выбор подгруппы поднимаем до основной группы
        const nextGroup = await resolveMainGroup(storedGroup);
        stored = await getSelectedSubject();
        if (!isActive) return;

        if (nextGroup && storedGroup && nextGroup.UID !== storedGroup.UID) {
          void saveSelectedGroup(nextGroup);
        }

        // Преподаватель/аудитория имеют приоритет: это осознанный выбор.
        // Группа берётся из профиля и обновляется, если её изменили.
        let nextSubject: ScheduleSubject | null = null;
        if (stored?.kind === "teacher" || stored?.kind === "room") {
          nextSubject = stored;
        } else if (nextGroup) {
          nextSubject = makeGroupSubject(nextGroup);
        }

        setGroup(nextGroup);

        if (!sameSubject(stored, nextSubject)) {
          void saveSelectedSubject(nextSubject);
        }

        const prevKey = subjectRef.current
          ? getSubjectKey(subjectRef.current)
          : null;
        const nextKey = nextSubject ? getSubjectKey(nextSubject) : null;

        if (nextKey !== prevKey) {
          // Гасим возможный запрос по старому субъекту до старта нового
          requestSeq.current += 1;

          const isFirstResolve = !hasResolvedRef.current;

          if (isFirstResolve && nextSubject) {
            const monday = getMondayOfWeek(new Date());
            weekStartRef.current = monday;
            setWeekStart(monday);

            // Воскресенье (6) → показываем субботу (5)
            const dayIndex = Math.min(
              getDayIndex(new Date()),
              WEEKDAYS_COUNT - 1,
            );
            initialPageRef.current = dayIndex;
            setInitialPage(dayIndex);
            setCurrentPage(dayIndex);
          }

          subjectRef.current = nextSubject;
          setSubject(nextSubject);

          setSchedule([]);
          setUpdate(null);
          setError(null);
          setIsStale(false);

          if (nextSubject) {
            setIsWeekLoading(true);
          } else {
            hasPagerMountedRef.current = false;
            setIsRefreshing(false);
            setIsWeekLoading(false);
            finishInitialLoading();
          }
          return;
        }

        if (nextSubject) {
          // Субъект тот же — обновляем подписи и тихо ревалидируем неделю
          subjectRef.current = nextSubject;
          setSubject(nextSubject);
          loadWeek(nextSubject, weekStartRef.current, { revalidate: true });
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

  // Загрузка при смене субъекта или недели
  const subjectKey = subject ? getSubjectKey(subject) : null;
  useEffect(() => {
    if (!subjectKey) return;
    const current = subjectRef.current;
    if (!current) return;
    loadWeek(current, weekStart);
  }, [subjectKey, weekStart, loadWeek]);

  // Возврат из фона: обновляем, если данные устарели
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" || !isFocusedRef.current) return;
      const current = subjectRef.current;
      if (!current) return;
      loadWeek(current, weekStartRef.current, { revalidate: true });
    });

    return () => subscription.remove();
  }, [loadWeek]);

  // Сеть восстановилась: одна тихая ревалидация текущей недели.
  useEffect(() => {
    const wasOffline = wasOfflineRef.current;
    wasOfflineRef.current = isOffline;

    if (!wasOffline || isOffline) return;

    const current = subjectRef.current;
    if (!current || !isFocusedRef.current) return;

    loadWeek(current, weekStartRef.current, { revalidate: true });
  }, [isOffline, loadWeek]);

  // Синхронизация PagerView при первом появлении (в т.ч. после выбора субъекта)
  useEffect(() => {
    if (!subject || isInitialLoading || hasPagerMountedRef.current) return;

    // requestAnimationFrame — чтобы PagerView успел смонтироваться
    const frame = requestAnimationFrame(() => {
      pagerRef.current?.setPage(initialPageRef.current);
      hasPagerMountedRef.current = true;
    });

    return () => cancelAnimationFrame(frame);
  }, [subject, isInitialLoading, pagerRef]);

  const goToWeek = useCallback((next: Date) => {
    requestSeq.current += 1;
    weekStartRef.current = next;
    setWeekStart(next);
    setSchedule([]);
    setUpdate(null);
    setError(null);
    setIsStale(false);
    setIsWeekLoading(true);
  }, []);

  const goToPrevWeek = useCallback(() => {
    goToWeek(addDays(weekStartRef.current, -7));
  }, [goToWeek]);

  const goToNextWeek = useCallback(() => {
    goToWeek(addDays(weekStartRef.current, 7));
  }, [goToWeek]);

  const goToWeekDate = useCallback(
    (date: Date) => {
      const monday = getMondayOfWeek(date);
      if (isSameDay(monday, weekStartRef.current)) return;
      goToWeek(monday);
    },
    [goToWeek],
  );

  const selectSubject = useCallback((next: ScheduleSubject) => {
    const prev = subjectRef.current;

    if (prev && getSubjectKey(prev) === getSubjectKey(next)) {
      // Тот же субъект — только обновляем подписи
      subjectRef.current = next;
      setSubject(next);
      void saveSelectedSubject(next);
      return;
    }

    requestSeq.current += 1;

    if (!prev) {
      // Первый выбор (например, из пустого состояния) — текущая неделя и день
      hasPagerMountedRef.current = false;
      const monday = getMondayOfWeek(new Date());
      weekStartRef.current = monday;
      setWeekStart(monday);

      const dayIndex = Math.min(getDayIndex(new Date()), WEEKDAYS_COUNT - 1);
      initialPageRef.current = dayIndex;
      setInitialPage(dayIndex);
      setCurrentPage(dayIndex);
    }

    subjectRef.current = next;
    setSubject(next);
    void saveSelectedSubject(next);

    setSchedule([]);
    setUpdate(null);
    setError(null);
    setIsStale(false);
    setIsWeekLoading(true);
  }, []);

  const refresh = useCallback(() => {
    const current = subjectRef.current;
    if (!current || isRefreshInFlightRef.current) return;

    isRefreshInFlightRef.current = true;
    setIsRefreshing(true);
    void loadWeek(current, weekStartRef.current, { force: true }).finally(() => {
      isRefreshInFlightRef.current = false;
    });
  }, [loadWeek]);

  return {
    subject,
    group,
    schedule,
    update,
    error,
    isStale,
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
  };
}
