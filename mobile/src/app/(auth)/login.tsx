import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState, type ComponentRef } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LoginError } from "../../api/auth";
import { colors, fonts, radii, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = username.trim().length > 0 && password.length > 0;

  const onSubmit = async () => {
    if (loading) return;
    if (!canSubmit) {
      setError("Введите логин и пароль");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await signIn(username.trim(), password);
      router.replace("/(app)");
    } catch (e) {
      setError(
        e instanceof LoginError
          ? e.message
          : "Не удалось войти. Попробуйте позже",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing.xl,
            paddingBottom: insets.bottom + spacing.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.brandPlate}>
            <Image
              source={require("../../../assets/images/brand/logo-full.png")}
              style={styles.brandLogo}
              resizeMode="contain"
              accessibilityLabel="Мурманский арктический университет"
            />
          </View>
          <Text style={styles.title}>MAUverse</Text>
          <Text style={styles.subtitle}>
            Расписание Мурманского арктического университета
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Логин</Text>
          <TextInput
            value={username}
            onChangeText={(value) => {
              setUsername(value);
              if (error) setError(null);
            }}
            placeholder="Доменный логин или email"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            importantForAutofill="yes"
            returnKeyType="next"
            editable={!loading}
            onSubmitEditing={() => passwordRef.current?.focus()}
            style={styles.input}
            accessibilityLabel="Логин"
          />

          <Text style={[styles.label, styles.labelSpaced]}>Пароль</Text>
          <View style={styles.passwordRow}>
            <TextInput
              ref={passwordRef}
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (error) setError(null);
              }}
              placeholder="Пароль"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              importantForAutofill="yes"
              secureTextEntry={!showPassword}
              returnKeyType="go"
              editable={!loading}
              onSubmitEditing={onSubmit}
              style={[styles.input, styles.passwordInput]}
              accessibilityLabel="Пароль"
            />
            <Pressable
              onPress={() => setShowPassword((visible) => !visible)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={
                showPassword ? "Скрыть пароль" : "Показать пароль"
              }
              style={({ pressed }) => [
                styles.eyeButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={21}
                color={colors.textMuted}
              />
            </Pressable>
          </View>

          {error ? (
            <View
              style={styles.errorBox}
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
            >
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color={colors.danger}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={onSubmit}
            disabled={!canSubmit || loading}
            accessibilityRole="button"
            accessibilityLabel="Войти"
            accessibilityState={{ disabled: !canSubmit || loading }}
            style={({ pressed }) => [
              styles.button,
              (!canSubmit || loading) && styles.buttonDisabled,
              pressed && styles.pressed,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.buttonText}>Войти</Text>
            )}
          </Pressable>

          <Text style={styles.hint}>
            Используйте учётную запись университета. Пароль передаётся только
            на сервер университета.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  hero: { alignItems: "center", marginBottom: spacing.xl },
  brandPlate: {
    width: 264,
    maxWidth: "100%",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  brandLogo: {
    width: 240,
    maxWidth: "100%",
    aspectRatio: 240 / 49,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 28,
    lineHeight: 34,
    color: colors.text,
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 300,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  label: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  labelSpaced: { marginTop: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    minHeight: 48,
  },
  passwordRow: { justifyContent: "center" },
  passwordInput: { paddingRight: 44 },
  eyeButton: {
    position: "absolute",
    right: spacing.sm,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    color: colors.onPrimary,
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
  },
  pressed: { opacity: 0.75 },
  hint: {
    marginTop: spacing.md,
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textMuted,
    textAlign: "center",
  },
});
