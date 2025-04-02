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
