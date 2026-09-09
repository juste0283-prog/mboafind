// Contexte i18n : langue (fr/en) + traduction avec interpolation + formats.
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { translations, type Language } from "./translations";

const STORAGE_KEY = "mboafind_lang";

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  formatNumber: (value: number) => string;
  formatCurrency: (value: number) => string;
  formatDate: (value?: string | null) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function getInitialLang(): Language {
  return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "fr";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(getInitialLang);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next === "fr" ? "fr" : "en";
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      let text = translations[lang][key] ?? translations.fr[key] ?? key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.split(`{${name}}`).join(String(value));
        }
      }
      return text;
    },
    [lang],
  );

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-US", {
        maximumFractionDigits: 0,
      }),
    [lang],
  );

  const formatNumber = useCallback(
    (value: number) => numberFormatter.format(value),
    [numberFormatter],
  );

  const formatCurrency = useCallback(
    (value: number) => `${numberFormatter.format(value)} FCFA`,
    [numberFormatter],
  );

  const formatDate = useCallback(
    (value?: string | null): string => {
      if (!value) return "—";
      return new Date(value).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    },
    [lang],
  );

  const value = useMemo(
    () => ({ lang, setLang, t, formatNumber, formatCurrency, formatDate }),
    [lang, setLang, t, formatNumber, formatCurrency, formatDate],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n doit être utilisé dans un I18nProvider");
  }
  return context;
}