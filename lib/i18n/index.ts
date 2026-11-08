// Hermes has no Intl.PluralRules, which i18next needs for plurals.
import "intl-pluralrules";

import { DEFAULT_LOCALE, SUPPORTED_LANGUAGES, getSupportedLocale } from "@/lib/locale";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { AppState } from "react-native";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, fr: { translation: fr } },
  lng: getSupportedLocale().languageCode,
  fallbackLng: DEFAULT_LOCALE.languageCode,
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: { escapeValue: false },
  // Resources are bundled: init synchronously so that i18n.t works on import.
  initAsync: false,
});

// iOS restarts the app when its language changes, Android doesn't.
AppState.addEventListener("change", (state) => {
  if (state !== "active") return;

  const language = getSupportedLocale().languageCode;
  if (language !== i18n.language) {
    i18n.changeLanguage(language);
  }
});

export { i18n };
