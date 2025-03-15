module.exports = {
  preset: "jest-expo",
  setupFiles: ["./jest.setup.ts"],
  transform: {
    "^.+\\.mjs$": "babel-jest",
  },
  transformIgnorePatterns: [
    "/node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|uuid|y-expo-sqlite|react-native-reanimated|)",
  ],
  coverageReporters: ["lcov", "cobertura", "text"],
  clearMocks: true,
  collectCoverageFrom: [
    "app/**/*.{js,jsx,ts,tsx}",
    "components/**/*.{js,jsx,ts,tsx}",
    "lib/**/*.{js,jsx,ts,tsx}",
  ],
};
