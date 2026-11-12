// utils/storage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  group: "selectedGroup",
  faculty: "selectedFaculty",
  course: "selectedCourse",
} as const;

export const saveSelectedGroup = async (group: any) => {
  if (group) {
    await AsyncStorage.setItem(KEYS.group, JSON.stringify(group));
  } else {
    await AsyncStorage.removeItem(KEYS.group);
  }
};

export const getSelectedGroup = async () => {
  const data = await AsyncStorage.getItem(KEYS.group);
  return data ? JSON.parse(data) : null;
};

export const saveSelectedFaculty = async (faculty: any) => {
  if (faculty) {
    await AsyncStorage.setItem(KEYS.faculty, JSON.stringify(faculty));
  } else {
    await AsyncStorage.removeItem(KEYS.faculty);
  }
};

export const getSelectedFaculty = async () => {
  const data = await AsyncStorage.getItem(KEYS.faculty);
  return data ? JSON.parse(data) : null;
};

export const saveSelectedCourse = async (course: any) => {
  if (course) {
    await AsyncStorage.setItem(KEYS.course, JSON.stringify(course));
  } else {
    await AsyncStorage.removeItem(KEYS.course);
  }
};

export const getSelectedCourse = async () => {
  const data = await AsyncStorage.getItem(KEYS.course);
  return data ? JSON.parse(data) : null;
};

// Очистка всего выбора (для logout)
export const clearProfileSelection = async () => {
  await AsyncStorage.multiRemove([KEYS.group, KEYS.faculty, KEYS.course]);
};

// Старая функция на всякий случай оставлена
export const clearSelectedGroup = async () => {
  await AsyncStorage.removeItem(KEYS.group);
};
