// src/hooks/useProfileSelection.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { getCourses, getFaculties, getMainGroups } from "../api/schedule";
import type { Course, Faculty, Group } from "../api/types";
import { useNetworkStatus } from "../context/NetworkStatusContext";
import { describeRequestError } from "../utils/apiError";
import { makeGroupSubject } from "../utils/subjects";
import {
  getSelectedCourse,
  getSelectedFaculty,
  getSelectedGroup,
  saveSelectedCourse,
  saveSelectedFaculty,
  saveSelectedGroup,
  saveSelectedSubject,
} from "../utils/storage";

export function useProfileSelection(onAfterSelect?: () => void) {
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isOffline } = useNetworkStatus();
  const wasOfflineRef = useRef(isOffline);

  // Защита от гонок: пользователь может быстро менять факультет/курс,
  // а восстановление сети запускает повторную загрузку поверх текущей.
  const loadSeqRef = useRef(0);
  const groupsSeqRef = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    setIsInitialLoading(true);
    setError(null);

    try {
      // API отдаёт факультеты в поле `courses` — особенность бэкенда
      const [facRes, courseRes] = await Promise.all([
        getFaculties(),
        getCourses(),
      ]);
      if (seq !== loadSeqRef.current) return;
      setFaculties(facRes.courses);
      setCourses(courseRes.courses);

      const [savedFaculty, savedCourse, savedGroup] = await Promise.all([
        getSelectedFaculty(),
        getSelectedCourse(),
        getSelectedGroup(),
      ]);
      if (seq !== loadSeqRef.current) return;
      if (savedFaculty) setSelectedFaculty(savedFaculty);
      if (savedCourse) setSelectedCourse(savedCourse);

      let effectiveGroup = savedGroup as Group | null;

      if (savedFaculty && savedCourse) {
        const groupsSeq = ++groupsSeqRef.current;
        try {
          const groupsRes = await getMainGroups(
            savedFaculty.fac_id,
            savedCourse.course_id,
          );
          if (
            seq !== loadSeqRef.current ||
            groupsSeq !== groupsSeqRef.current
          ) {
            return;
          }
          setGroups(groupsRes.groups);

          // Миграция со старого выбора подгруппы на основную группу
          const selected = effectiveGroup;
          if (selected?.UID_mg) {
            const mainGroup = groupsRes.groups.find(
              (group) =>
                group.UID === selected.UID_mg ||
                group.group_id === selected.maingroup_id,
            );
            if (mainGroup) {
              effectiveGroup = mainGroup;
              await Promise.all([
                saveSelectedGroup(mainGroup),
                saveSelectedSubject(makeGroupSubject(mainGroup)),
              ]);
            }
          }
        } catch (e) {
          if (
            seq !== loadSeqRef.current ||
            groupsSeq !== groupsSeqRef.current
          ) {
            return;
          }
          console.warn("[profile] groups preload failed", e);
          setError(
            describeRequestError(e, "Не удалось загрузить список групп"),
          );
        }
      }

      if (seq === loadSeqRef.current && effectiveGroup) {
        setSelectedGroup(effectiveGroup);
      }
    } catch (e) {
      if (seq !== loadSeqRef.current) return;
      console.warn("[profile] init failed", e);
      setError(
        describeRequestError(e, "Не удалось загрузить данные профиля"),
      );
    } finally {
      if (seq === loadSeqRef.current) setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    // Загрузка данных при монтировании: setState происходит в async-загрузчике
    // после await, это не синхронный каскадный рендер из эффекта.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // После восстановления сети повторяем загрузку без действий пользователя.
  useEffect(() => {
    const wasOffline = wasOfflineRef.current;
    wasOfflineRef.current = isOffline;

    if (!wasOffline || isOffline) return;
    void load();
  }, [isOffline, load]);

  const loadGroups = async (facId: number, courseId: number) => {
    const seq = ++groupsSeqRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const res = await getMainGroups(facId, courseId);
      if (seq !== groupsSeqRef.current) return;
      setGroups(res.groups);
    } catch (e) {
      if (seq !== groupsSeqRef.current) return;
      console.warn("[profile] groups load failed", e);
      setError(describeRequestError(e, "Не удалось загрузить группы"));
    } finally {
      if (seq === groupsSeqRef.current) setIsLoading(false);
    }
  };

  const selectFaculty = async (faculty: Faculty) => {
    setSelectedFaculty(faculty);
    setSelectedGroup(null);
    // сбрасываем список групп, чтобы не показывать устаревшие
    setGroups([]);
    setError(null);
    await saveSelectedGroup(null);
    await saveSelectedFaculty(faculty);
    // закрываем модалку сразу после выбора
    onAfterSelect?.();
    if (selectedCourse) {
      await loadGroups(faculty.fac_id, selectedCourse.course_id);
    }
  };

  const selectCourse = async (course: Course) => {
    setSelectedCourse(course);
    setSelectedGroup(null);
    setGroups([]);
    setError(null);
    await saveSelectedGroup(null);
    await saveSelectedCourse(course);
    onAfterSelect?.();
    if (selectedFaculty) {
      await loadGroups(selectedFaculty.fac_id, course.course_id);
    }
  };

  const selectGroup = async (group: Group) => {
    setSelectedGroup(group);
    setError(null);
    await Promise.all([
      saveSelectedGroup(group),
      saveSelectedSubject(makeGroupSubject(group)),
    ]);
    onAfterSelect?.();
  };

  return {
    faculties,
    courses,
    groups,
    selectedFaculty,
    selectedCourse,
    selectedGroup,
    isLoading,
    isInitialLoading,
    error,
    reload: load,
    selectFaculty,
    selectCourse,
    selectGroup,
  };
}
