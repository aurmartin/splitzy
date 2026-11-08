const baseConfig = require("./jest.config");

module.exports = {
  ...baseConfig,
  testMatch: ["**/*.integration.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/.claude/"],
  testEnvironment: "<rootDir>/jest.integration-environment.js",
  forceExit: true,
};
