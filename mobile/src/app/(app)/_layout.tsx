import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, type ColorValue } from "react-native";
import { OfflineBanner } from "../../components/OfflineBanner";
import {
  colors,
  fontScaleCaps,
  typography,
} from "../../constants/theme";

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
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.borderLight,
          },
          tabBarItemStyle: {
            paddingVertical: 2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Расписание",
            // Свой label вместо tabBarLabelStyle: нужен maxFontSizeMultiplier,
            // иначе при крупном системном шрифте подпись обрезается в tab bar.
            tabBarLabel: ({ color }) => (
              <Text
                maxFontSizeMultiplier={fontScaleCaps.compact}
                style={[styles.tabLabel, { color }]}
              >
                Расписание
              </Text>
            ),
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
            tabBarLabel: ({ color }) => (
              <Text
                maxFontSizeMultiplier={fontScaleCaps.compact}
                style={[styles.tabLabel, { color }]}
              >
                Профиль
              </Text>
            ),
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
        <Tabs.Screen
          name="setup"
          options={{
            href: null,
            title: "Настройка",
            tabBarStyle: { display: "none" },
          }}
        />
      </Tabs>
        <OfflineBanner />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  tabLabel: {
    ...typography.micro,
  },
});
