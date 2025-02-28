module.exports = {
  extends: ["expo", "prettier"],
  plugins: ["prettier"],
  rules: {
    "prettier/prettier": "error",
  },
  ignorePatterns: [
    "node_modules",
    ".expo",
    "dist/**",
    "android/**",
    "ios/**",
    "server/**",
    "coverage/**",
  ],
};
