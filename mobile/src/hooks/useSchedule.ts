// src/hooks/useSchedule.ts
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { getSchedule } from "../api/schedule";
import { Group, Lesson } from "../api/types";
import {
  formatLocalDate,
  getDayIndex,
  getMondayOfWeek,
  WEEKDAYS_COUNT,
} from "../constants/schedule";
import { getSelectedGroup } from "../utils/storage";

type PagerRef = React.RefObject<{ setPage: (i: number) => void } | null>;

export function useSchedule(pagerRef: PagerRef) {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [schedule, setSchedule] = useState<Lesson[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  const initialPageRef = useRef(0);

  // ref-ы для чтения актуальных значений внутри useFocusEffect
  // (стейт в замыкании useCallback был бы устаревшим)
  const selectedGroupRef = useRef<Group | null>(null);
  const scheduleRef = useRef<Lesson[]>([]);
  useEffect(() => {
    selectedGroupRef.current = selectedGroup;
  }, [selectedGroup]);
  useEffect(() => {
    scheduleRef.current = schedule;
  }, [schedule]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const load = async () => {
        try {
          const group = await getSelectedGroup();
          if (!isActive) return;

          // Группа та же и данные уже есть — не перезагружаем
          const sameGroup = group?.UID === selectedGroupRef.current?.UID;
          const hasData = scheduleRef.current.length > 0;
          if (sameGroup && hasData) {
            return;
          }

          setSelectedGroup(group);

          if (!group) {
            setSchedule([]);
            return;
          }

          // Сбрасываем расписание только при смене группы
          if (!sameGroup) {
            setSchedule([]);
          }

          setIsInitialLoading(true);

          const today = new Date();
          const monday = getMondayOfWeek(today);
          const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);

          const res = await getSchedule(
            group.UID,
            formatLocalDate(monday),
            formatLocalDate(sunday),
          );
          if (!isActive) return;

          setSchedule(res.timetable);

          // Воскресенье (6) → показываем субботу (5)
          const dayIndex = Math.min(getDayIndex(today), WEEKDAYS_COUNT - 1);
          initialPageRef.current = dayIndex;
          setCurrentPage(dayIndex);
        } catch (e: any) {
          console.error("[schedule] load failed", e);
          if (isActive) {
            Alert.alert("Ошибка", "Не удалось загрузить расписание");
          }
        } finally {
          if (isActive) setIsInitialLoading(false);
        }
      };

      load();

      return () => {
        isActive = false;
      };
    }, [pagerRef]),
  );

  // Синхронизируем пейджер с вычисленной страницей после загрузки
  useEffect(() => {
    if (isInitialLoading || !selectedGroup) return;
    const idx = initialPageRef.current;
    // requestAnimationFrame — чтобы PagerView успел смонтироваться (key по UID группы)
    requestAnimationFrame(() => pagerRef.current?.setPage(idx));
  }, [isInitialLoading, selectedGroup, pagerRef]);

  return {
    selectedGroup,
    schedule,
    isInitialLoading,
    currentPage,
    setCurrentPage,
    initialPage: initialPageRef.current,
  };
}
