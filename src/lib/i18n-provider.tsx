import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { I18nextProvider } from "react-i18next";

import i18n, { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, LocaleId, SUPPORTED_LOCALES } from "@/i18n";

export const LOCALE_OPTIONS: Array<{ id: LocaleId; labelKey: string; shortLabel: string }> = [
  { id: "pt-BR", labelKey: "language.pt-BR", shortLabel: "PT" },
  { id: "en", labelKey: "language.en", shortLabel: "EN" },
  { id: "es", labelKey: "language.es", shortLabel: "ES" },
];

type I18nContextValue = {
  locale: LocaleId;
  setLocale: (next: LocaleId) => void;
};

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

function isLocale(value: string): value is LocaleId {
  return SUPPORTED_LOCALES.includes(value as LocaleId);
}

export function AppI18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleId>(DEFAULT_LOCALE);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    const nextLocale: LocaleId = raw && isLocale(raw) ? raw : DEFAULT_LOCALE;
    setLocaleState(nextLocale);
    void i18n.changeLanguage(nextLocale);
    document.documentElement.lang = nextLocale;
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale: (next: LocaleId) => {
        setLocaleState(next);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
        }
        document.documentElement.lang = next;
        void i18n.changeLanguage(next);
      },
    }),
    [locale],
  );

  return (
    <I18nextProvider i18n={i18n}>
      <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
    </I18nextProvider>
  );
}

export function useAppLocale(): I18nContextValue {
  return useContext(I18nContext);
}
