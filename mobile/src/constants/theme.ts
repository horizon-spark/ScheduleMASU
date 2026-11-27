// src/constants/theme.ts
// Палитра и шрифты по фирменному стилю МАУ: https://mauniver.ru/info/design/
const brandBlue = "#0064BE";
const brandSky = "#008CFA";
const brandRed = "#F9423A";
const brandGreen = "#14898F";

export const fonts = {
  heading: "Montserrat_700Bold",
  headingSemibold: "Montserrat_600SemiBold",
  body: "OpenSans_400Regular",
  bodySemibold: "OpenSans_600SemiBold",
} as const;

export const colors = {
  // Основная палитра
  brandBlue,
  brandSky,
  brandRed,
  brandGreen,
  primary: brandBlue,
  primaryPressed: "#00539C",
  primarySoft: "#E6F0FA",
  secondary: brandSky,
  secondarySoft: "#E6F4FF",

  // Фоны и поверхности
  background: "#F2F5FA",
  surface: "#FFFFFF",
  surfaceMuted: "#FAFAFA",

  // Текст
  text: "#1E1E1E",
  textSecondary: "#666666",
  // Для мелкого текста используем серый с контрастом ≥ 4.5:1 на фоне #F2F5FA.
  textMuted: "#5F6773",

  // Границы
  border: "#DDDDDD",
  borderLight: "#EEEEEE",

  // Акценты и статусы
  accent: brandRed,
  accentSoft: "#FDECEC",
  danger: "#B42318",
  dangerSoft: "#FDECEC",
  success: "#0F766E",
  successSoft: "#E6F7F7",
  warningBackground: "#FFF3CD",
  warningText: "#7A5B16",

  // Служебное
  onPrimary: "#FFFFFF",
  // Полупрозрачный белый на #0064BE: 0.85 даёт контраст ~4.7:1,
  // 0.92 — ~5.3:1. Более прозрачный текст не проходит AA для мелкого кегля.
  onPrimaryMuted: "rgba(255,255,255,0.85)",
  onPrimarySubtle: "rgba(255,255,255,0.92)",
  overlay: "rgba(15,23,42,0.45)",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const typography = {
  display: { fontFamily: fonts.heading, fontSize: 28, lineHeight: 34 },
  title: { fontFamily: fonts.heading, fontSize: 22, lineHeight: 28 },
  headline: { fontFamily: fonts.headingSemibold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  bodyStrong: { fontFamily: fonts.bodySemibold, fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  captionStrong: { fontFamily: fonts.bodySemibold, fontSize: 13, lineHeight: 18 },
  micro: { fontFamily: fonts.bodySemibold, fontSize: 11, lineHeight: 15 },
} as const;

/**
 * Ограничение системного масштаба шрифта для компактных элементов:
 * фиксированных высот, tab bar, кружков дней и строк списков. Без него
 * при «крупном шрифте» Android текст обрезается внутри фиксированных
 * контейнеров. Обычный текст экранов масштабируется без ограничений.
 */
export const fontScaleCaps = {
  compact: 1.2,
  text: 1.4,
} as const;

export const minTouchTarget = 44;

export const shadows = {
  card: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sheet: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
} as const;
