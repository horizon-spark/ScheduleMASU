import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { ColorValue } from "react-native";
import { colors, typography } from "../../constants/theme";

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
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.borderLight,
          },
          tabBarLabelStyle: {
            ...typography.micro,
            fontWeight: "500",
          },
          tabBarItemStyle: {
            paddingVertical: 4,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Расписание",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "calendar" : "calendar-outline"}
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
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "person" : "person-outline"}
                size={24}
                color={toIconColor(color)}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="about"
          options={{
            href: null,
            title: "О приложении",
            tabBarStyle: { display: "none" },
          }}
        />
      </Tabs>
    </>
  );
}
