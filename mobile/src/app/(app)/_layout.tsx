import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { ColorValue } from "react-native";

/**
 * tabBarIcon отдаёт ColorValue (string | number | symbol | null),
 * а @expo/vector-icons принимает только string | OpaqueColorValue.
 * Для нестроковых значений оставляем цвет иконки по умолчанию.
 */
function toIconColor(color: ColorValue): string | undefined {
  return typeof color === "string" ? color : undefined;
}

export default function AppLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{ tabBarActiveTintColor: "#0055A5", headerShown: false }}
      >
      <Tabs.Screen
        name="index"
        options={{
          title: "Расписание",
          tabBarIcon: ({ color }) => (
            <Ionicons
              name="calendar-outline"
              size={24}
              color={toIconColor(color)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Профиль",
          tabBarIcon: ({ color }) => (
            <Ionicons
              name="person-outline"
              size={24}
              color={toIconColor(color)}
            />
          ),
        }}
      />
      </Tabs>
    </>
  );
}
