import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/i18n/locales/en.json";
import es from "@/i18n/locales/es.json";
import ptBR from "@/i18n/locales/pt-BR.json";

export const LOCALE_STORAGE_KEY = "andromeda_locale";
export const DEFAULT_LOCALE = "pt-BR";
export const SUPPORTED_LOCALES = ["pt-BR", "en", "es"] as const;
export type LocaleId = (typeof SUPPORTED_LOCALES)[number];

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      "pt-BR": { translation: ptBR },
      en: { translation: en },
      es: { translation: es },
    },
    lng: DEFAULT_LOCALE,
    fallbackLng: DEFAULT_LOCALE,
    interpolation: {
      escapeValue: false,
    },
  });
}

export default i18n;
