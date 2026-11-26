const { defineConfig, globalIgnores } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const globals = require("globals");

module.exports = defineConfig([
  globalIgnores(["dist/*", ".expo/*", "node_modules/*"]),
  expoConfig,
  {
    files: ["app.config.js", "eslint.config.js", "*.config.js"],
    languageOptions: {
      globals: globals.node,
    },
  },
]);
