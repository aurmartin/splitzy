const { defineConfig, globalIgnores } = require("eslint/config");

const prettier = require("eslint-plugin-prettier");
const js = require("@eslint/js");

const { FlatCompat } = require("@eslint/eslintrc");

const compat = new FlatCompat({
  // eslint-disable-next-line no-undef
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

module.exports = defineConfig([
  {
    extends: compat.extends("expo", "prettier"),
    plugins: { prettier },
    rules: {
      "prettier/prettier": "error",
    },
  },
  globalIgnores([
    "**/node_modules",
    "**/.expo",
    "dist/**/*",
    "android/**/*",
    "ios/**/*",
    "server/**/*",
    "coverage/**/*",
  ]),
]);
