// app.config.js
// Динамический конфиг: production-сборка обязана использовать HTTPS,
// а cleartext-трафик остаётся только для development/preview.
const appVariant = process.env.APP_VARIANT;
const isProduction = appVariant === "production";
const isEasBuild = Boolean(appVariant);

module.exports = ({ config }) => {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  if (isEasBuild && !apiBaseUrl) {
    throw new Error(
      "EXPO_PUBLIC_API_BASE_URL is required for all EAS builds",
    );
  }

  if (isProduction && !apiBaseUrl.startsWith("https://")) {
    throw new Error(
      "EXPO_PUBLIC_API_BASE_URL must use https:// in production builds",
    );
  }

  const plugins = (config.plugins ?? []).map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === "expo-build-properties") {
      const options = plugin[1] ?? {};
      return [
        plugin[0],
        {
          ...options,
          android: {
            ...(options.android ?? {}),
            usesCleartextTraffic: !isProduction,
          },
        },
      ];
    }
    return plugin;
  });

  return {
    ...config,
    plugins,
  };
};
