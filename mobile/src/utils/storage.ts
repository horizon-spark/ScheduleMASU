// utils/storage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Course, Faculty, Group } from "../api/types";
import type { ScheduleSubject } from "../types/schedule";
import { isScheduleSubject } from "../types/schedule";

const KEYS = {
  group: "selectedGroup",
  faculty: "selectedFaculty",
  course: "selectedCourse",
  subject: "scheduleSubject",
} as const;

function parseStored<T>(raw: string | null): T | null {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const saveSelectedGroup = async (group: Group | null) => {
  if (group) {
    await AsyncStorage.setItem(KEYS.group, JSON.stringify(group));
  } else {
    await AsyncStorage.removeItem(KEYS.group);
  }
};

export const getSelectedGroup = async (): Promise<Group | null> => {
  const data = await AsyncStorage.getItem(KEYS.group);
  return parseStored<Group>(data);
};

export const saveSelectedFaculty = async (faculty: Faculty | null) => {
  if (faculty) {
    await AsyncStorage.setItem(KEYS.faculty, JSON.stringify(faculty));
  } else {
    await AsyncStorage.removeItem(KEYS.faculty);
  }
};

export const getSelectedFaculty = async (): Promise<Faculty | null> => {
  const data = await AsyncStorage.getItem(KEYS.faculty);
  return parseStored<Faculty>(data);
};

export const saveSelectedCourse = async (course: Course | null) => {
  if (course) {
    await AsyncStorage.setItem(KEYS.course, JSON.stringify(course));
  } else {
    await AsyncStorage.removeItem(KEYS.course);
  }
};

export const getSelectedCourse = async (): Promise<Course | null> => {
  const data = await AsyncStorage.getItem(KEYS.course);
  return parseStored<Course>(data);
};

export const saveSelectedSubject = async (
  subject: ScheduleSubject | null,
): Promise<void> => {
  if (subject) {
    await AsyncStorage.setItem(KEYS.subject, JSON.stringify(subject));
  } else {
    await AsyncStorage.removeItem(KEYS.subject);
  }
};

export const getSelectedSubject = async (): Promise<ScheduleSubject | null> => {
  const data = await AsyncStorage.getItem(KEYS.subject);
  if (!data) return null;

  try {
    const parsed: unknown = JSON.parse(data);
    return isScheduleSubject(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

// Очистка всего выбора (для logout)
export const clearProfileSelection = async () => {
  await AsyncStorage.multiRemove([
    KEYS.group,
    KEYS.faculty,
    KEYS.course,
    KEYS.subject,
  ]);
};

// Старая функция на всякий случай оставлена
export const clearSelectedGroup = async () => {
  await AsyncStorage.removeItem(KEYS.group);
};
