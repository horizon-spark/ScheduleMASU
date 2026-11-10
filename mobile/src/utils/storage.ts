import AsyncStorage from "@react-native-async-storage/async-storage";

export const saveSelectedGroup = async (group: any) => {
  await AsyncStorage.setItem("selectedGroup", JSON.stringify(group));
};

export const getSelectedGroup = async () => {
  const data = await AsyncStorage.getItem("selectedGroup");
  return data ? JSON.parse(data) : null;
};

export const clearSelectedGroup = async () => {
  await AsyncStorage.removeItem("selectedGroup");
};
