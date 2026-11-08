import { getLocales } from "expo-localization";

const DEFAULT_LOCALE = "en-US";

const getLocale = (): string => {
  const locales = getLocales();
  return locales[0]?.languageCode || DEFAULT_LOCALE;
};

const getDecimalSeparator = (): string => (1.5).toLocaleString(getLocale()).charAt(1);

export { getLocale, getDecimalSeparator };
