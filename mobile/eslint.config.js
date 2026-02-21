// eslint.config.js
// BizAssist_mobile — ESLint Flat Config (Expo aligned)

const { defineConfig } = require("eslint/config");
const expo = require("eslint-config-expo/flat");

module.exports = defineConfig([
  ...expo,

  {
    ignores: [
      "dist/**",
      "node_modules/**",
      ".expo/**",
      "build/**",
    ],
  },
]);
