// @ts-ignore
import mockRNCNetInfo from "@react-native-community/netinfo/jest/netinfo-mock";

jest.mock("expo-font");

jest.mock("@react-native-community/netinfo", () => mockRNCNetInfo);

jest.mock("./lib/env", () => {
  return { Env: require("./env").ClientEnv };
});
