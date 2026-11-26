// src/hooks/useProfileSelection.ts
import { useCallback, useEffect, useState } from "react";
import { getCourses, getFaculties, getMainGroups } from "../api/schedule";
import type { Course, Faculty, Group } from "../api/types";
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

  const load = useCallback(async () => {
    setIsInitialLoading(true);
    setError(null);

    try {
      // API отдаёт факультеты в поле `courses` — особенность бэкенда
      const [facRes, courseRes] = await Promise.all([
        getFaculties(),
        getCourses(),
      ]);
      setFaculties(facRes.courses);
      setCourses(courseRes.courses);

      const [savedFaculty, savedCourse, savedGroup] = await Promise.all([
        getSelectedFaculty(),
        getSelectedCourse(),
        getSelectedGroup(),
      ]);
      if (savedFaculty) setSelectedFaculty(savedFaculty);
      if (savedCourse) setSelectedCourse(savedCourse);

      let effectiveGroup = savedGroup as Group | null;

      if (savedFaculty && savedCourse) {
        try {
          const groupsRes = await getMainGroups(
            savedFaculty.fac_id,
            savedCourse.course_id,
          );
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
          console.warn("[profile] groups preload failed", e);
          setError(
            describeRequestError(e, "Не удалось загрузить список групп"),
          );
        }
      }

      if (effectiveGroup) setSelectedGroup(effectiveGroup);
    } catch (e) {
      console.warn("[profile] init failed", e);
      setError(
        describeRequestError(e, "Не удалось загрузить данные профиля"),
      );
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    // Загрузка данных при монтировании: setState происходит в async-загрузчике
    // после await, это не синхронный каскадный рендер из эффекта.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const loadGroups = async (facId: number, courseId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await getMainGroups(facId, courseId);
      setGroups(res.groups);
    } catch (e) {
      console.warn("[profile] groups load failed", e);
      setError(describeRequestError(e, "Не удалось загрузить группы"));
    } finally {
      setIsLoading(false);
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
