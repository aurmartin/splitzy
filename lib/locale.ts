import { getLocales, type Locale } from "expo-localization";

const SUPPORTED_LANGUAGES = ["en", "fr"];

type SupportedLocale = {
  languageTag: string;
  languageCode: string;
};

const DEFAULT_LOCALE: SupportedLocale = { languageTag: "en-US", languageCode: "en" };

const getDeviceLocale = (): Locale => getLocales()[0];

const getSupportedLocale = (): SupportedLocale => {
  for (const { languageTag, languageCode } of getLocales()) {
    if (languageCode !== null && SUPPORTED_LANGUAGES.includes(languageCode)) {
      return { languageTag, languageCode };
    }
  }

  return DEFAULT_LOCALE;
};

const getDecimalSeparator = (): string => (1.5).toLocaleString(getDeviceLocale().languageTag).charAt(1);

const formatDate = (date: Date, options?: Intl.DateTimeFormatOptions): string =>
  date.toLocaleDateString(getDeviceLocale().languageTag, options);

export {
  DEFAULT_LOCALE,
  SUPPORTED_LANGUAGES,
  formatDate,
  getDecimalSeparator,
  getDeviceLocale,
  getSupportedLocale,
  type SupportedLocale,
};
