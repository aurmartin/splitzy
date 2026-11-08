import * as Localization from "expo-localization";
import { formatDate, getDecimalSeparator, getSupportedLocale } from "./locale";

// getLocales is already a jest-expo mock: spyOn returns it, and mockRestore
// would wipe its return value for the following tests.
const mockDeviceLocales = (...languageTags: [string, ...string[]]) => {
  const [deviceLocale] = Localization.getLocales();
  const toLocale = (languageTag: string) => ({
    ...deviceLocale,
    languageTag,
    languageCode: languageTag.split("-")[0],
  });
  const [first, ...rest] = languageTags;
  jest.spyOn(Localization, "getLocales").mockReturnValueOnce([toLocale(first), ...rest.map(toLocale)]);
};

describe("getSupportedLocale", () => {
  it.each<[[string, ...string[]], { languageTag: string; languageCode: string }]>([
    [["fr-FR"], { languageTag: "fr-FR", languageCode: "fr" }],
    [["en-GB"], { languageTag: "en-GB", languageCode: "en" }],
    [["de-DE", "fr-FR"], { languageTag: "fr-FR", languageCode: "fr" }],
    [["de-DE"], { languageTag: "en-US", languageCode: "en" }],
  ])("should pick the first supported locale of %j", (languageTags, expected) => {
    mockDeviceLocales(...languageTags);

    expect(getSupportedLocale()).toEqual(expected);
  });
});

describe("getDecimalSeparator", () => {
  it("should follow the device locale, even when the app doesn't support its language", () => {
    expect(getDecimalSeparator()).toBe(".");

    mockDeviceLocales("de-DE", "en-US");
    expect(getDecimalSeparator()).toBe(",");
  });
});

describe("formatDate", () => {
  it("should follow the device locale, region included", () => {
    const date = new Date(2026, 10, 8);

    expect(formatDate(date)).toBe("11/8/2026");

    mockDeviceLocales("en-GB");
    expect(formatDate(date)).toBe("08/11/2026");

    mockDeviceLocales("de-DE", "fr-FR");
    expect(formatDate(date)).toBe("8.11.2026");
  });
});
