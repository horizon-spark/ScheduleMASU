import { Ionicons } from "@expo/vector-icons";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii, spacing } from "../../constants/theme";

const SUPPORT_EMAIL = "mauverse@mauniver.ru";

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const version =
    Constants.expoConfig?.version ??
    Application.nativeApplicationVersion ??
    "1.0.0";
  const build = Application.nativeBuildVersion;

  const openSupport = () => {
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Назад"
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
          <Text style={styles.backText}>Назад</Text>
        </Pressable>
        <Text style={styles.headerTitle}>О приложении</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
      >
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Ionicons name="school-outline" size={42} color={colors.primary} />
          </View>
          <Text style={styles.name}>MAUverse</Text>
          <Text style={styles.version}>
            Версия {version}
            {build ? ` · сборка ${build}` : ""}
          </Text>
          <Text style={styles.description}>
            Расписание Мурманского арктического университета
          </Text>
        </View>

        <View style={styles.card}>
          <Pressable
            onPress={openSupport}
            accessibilityRole="link"
            accessibilityLabel={`Написать в поддержку ${SUPPORT_EMAIL}`}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Text style={styles.rowLabel}>Поддержка</Text>
            <Text style={styles.link}>{SUPPORT_EMAIL}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Конфиденциальность</Text>
          <Text style={styles.text}>
            Для входа используется доменная учётная запись университета.
            Пароль передаётся только на сервер университета и не сохраняется
            на устройстве. Выбранная группа, кеш расписания и токены сессии
            хранятся локально на устройстве; токены — в защищённом хранилище.
          </Text>
        </View>

        <Text style={styles.footer}>
          Мурманский арктический университет
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  back: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    minHeight: 32,
  },
  backText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 2,
  },
  headerTitle: {
    marginTop: spacing.sm,
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  content: { padding: spacing.lg },
  hero: { alignItems: "center", marginVertical: spacing.lg },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  name: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
  },
  version: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: colors.textSecondary,
  },
  description: {
    marginTop: spacing.sm,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  row: { minHeight: 44, justifyContent: "center" },
  rowLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  link: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  text: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  footer: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
  },
  pressed: { opacity: 0.7 },
});
