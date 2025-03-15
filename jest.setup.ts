// @ts-ignore
import mockRNCNetInfo from "@react-native-community/netinfo/jest/netinfo-mock";

jest.mock("expo-font", () => {
  return {
    isLoaded: jest.fn().mockReturnValue(true),
  };
});

jest.mock("@react-native-community/netinfo", () => mockRNCNetInfo);

jest.mock("./lib/env", () => {
  return { Env: require("./env").ClientEnv };
});

jest.mock("drizzle-orm/expo-sqlite", () => {
  return {
    // execute the query once on the database
    useLiveQuery: jest.fn().mockImplementation((query) => {
      return {
        data: query.all(),
      };
    }),
  };
});
