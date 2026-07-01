import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import es from "./locales/es.json";
import ptBR from "./locales/pt-BR.json";

function storedLocale(): string {
  try {
    return localStorage.getItem("t2c.locale") || "pt-BR";
  } catch {
    return "pt-BR";
  }
}

void i18n.use(initReactI18next).init({
  resources: {
    "pt-BR": { translation: ptBR },
    en: { translation: en },
    es: { translation: es },
  },
  lng: storedLocale(),
  fallbackLng: "pt-BR",
  interpolation: { escapeValue: false },
});

export default i18n;
