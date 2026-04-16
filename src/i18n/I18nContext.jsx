import { createContext, useContext, useMemo } from "react";
import {
  getByPath,
  resolveLocale,
  SUPPORTED_LOCALES,
  translations
} from "./translations";

const I18nContext = createContext(null);

export function detectInitialLocale() {
  if (typeof window === "undefined") {
    return "zh-CN";
  }

  const fromBrowser = window.navigator.language;
  return resolveLocale(fromBrowser);
}

export function I18nProvider({ locale, setLocale, children }) {
  const resolvedLocale = resolveLocale(locale);
  const dictionary = translations[resolvedLocale];

  const value = useMemo(() => {
    const t = (path, fallback) => {
      const direct = getByPath(dictionary, path);
      if (direct !== undefined) {
        return direct;
      }

      const fromDefault = getByPath(translations["en-US"], path);
      return fromDefault !== undefined ? fromDefault : fallback ?? path;
    };

    const formatDateTime = (date) =>
      new Intl.DateTimeFormat(resolvedLocale, {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(date);

    return {
      locale: resolvedLocale,
      setLocale,
      t,
      formatDateTime,
      supportedLocales: SUPPORTED_LOCALES
    };
  }, [dictionary, resolvedLocale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return context;
}
