// @ts-ignore
import mockRNCNetInfo from "@react-native-community/netinfo/jest/netinfo-mock";

jest.mock("expo-crypto", () => ({
  randomUUID: require("crypto").randomUUID,
}));

jest.mock("expo-font", () => {
  return {
    isLoaded: jest.fn().mockReturnValue(true),
  };
});

jest.mock("@react-native-community/netinfo", () => mockRNCNetInfo);

// react-native-mmkv uses its own in-memory mock under Jest, but still imports
// react-native-nitro-modules, which requires a native TurboModule on load.
jest.mock("react-native-nitro-modules", () => ({
  NitroModules: {},
}));

jest.mock("@expo/react-native-action-sheet");

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ base64: "test-base64" }],
  }),
  getMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({
    granted: true,
  }),
}));

jest.mock("./lib/env", () => {
  return { Env: require("./env").ClientEnv };
});

jest.mock("@/lib/supabase-connector");
jest.mock("@/lib/server-connector");
