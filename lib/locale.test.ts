import * as Localization from "expo-localization";
import { getDecimalSeparator } from "./locale";

describe("getDecimalSeparator", () => {
  it("should follow the device's language", () => {
    expect(getDecimalSeparator()).toBe(".");

    const [deviceLocale] = Localization.getLocales();
    const getLocales = jest
      .spyOn(Localization, "getLocales")
      .mockReturnValue([{ ...deviceLocale, languageCode: "fr" }]);
    expect(getDecimalSeparator()).toBe(",");

    getLocales.mockRestore();
  });
});
