// src/hooks/useProfileSelection.ts
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { getCourses, getFaculties, getGroups } from "../api/schedule";
import { Course, Faculty, Group } from "../api/types";
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

  useEffect(() => {
    const init = async () => {
      try {
        setIsInitialLoading(true);

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
        if (savedGroup) setSelectedGroup(savedGroup);

        if (savedFaculty && savedCourse) {
          try {
            const groupsRes = await getGroups(
              savedFaculty.fac_id,
              savedCourse.course_id,
            );
            setGroups(groupsRes.groups);
          } catch (e) {
            console.warn("[profile] groups preload failed", e);
          }
        }
      } catch (e: any) {
        console.warn("[profile] init failed", e);
        Alert.alert(
          "Ошибка",
          `Не удалось загрузить данные: ${e?.message ?? "неизвестно"}`,
        );
      } finally {
        setIsInitialLoading(false);
      }
    };
    init();
  }, []);

  const loadGroups = async (facId: number, courseId: number) => {
    try {
      setIsLoading(true);
      const res = await getGroups(facId, courseId);
      setGroups(res.groups);
    } catch {
      Alert.alert("Ошибка", "Не удалось загрузить группы");
    } finally {
      setIsLoading(false);
    }
  };

  const selectFaculty = async (faculty: Faculty) => {
    setSelectedFaculty(faculty);
    setSelectedGroup(null);
    // сбрасываем список групп, чтобы не показывать устаревшие
    setGroups([]);
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
    await saveSelectedGroup(null);
    await saveSelectedCourse(course);
    onAfterSelect?.();
    if (selectedFaculty) {
      await loadGroups(selectedFaculty.fac_id, course.course_id);
    }
  };

  const selectGroup = async (group: Group) => {
    setSelectedGroup(group);
    await Promise.all([
      saveSelectedGroup(group),
      saveSelectedSubject(makeGroupSubject(group)),
    ]);
    onAfterSelect?.();
    Alert.alert("Сохранено", `Группа ${group.group} выбрана`);
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
    selectFaculty,
    selectCourse,
    selectGroup,
  };
}
