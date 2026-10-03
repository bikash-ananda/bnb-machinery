"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { messages, type Language, type MessageKey } from "@/lib/i18n/messages";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: MessageKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
let currentLanguage: Language = "en";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getLanguageSnapshot() {
  return currentLanguage;
}

function getServerLanguageSnapshot(): Language {
  return "en";
}

function publishLanguage(language: Language) {
  currentLanguage = language;
  if (typeof document !== "undefined") {
    document.documentElement.dataset.language = language;
    document.documentElement.lang = language;
  }
  listeners.forEach((listener) => listener());
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = useSyncExternalStore(
    subscribe,
    getLanguageSnapshot,
    getServerLanguageSnapshot,
  );

  function setLanguage(next: Language) {
    publishLanguage(next);
    try {
      window.localStorage.setItem("bnb-language", next);
    } catch {
      // Language choice remains active for this page view.
    }
  }

  useEffect(() => {
    try {
      if (window.localStorage.getItem("bnb-language") === "ne") {
        publishLanguage("ne");
      }
    } catch {
      // Use English when local storage is unavailable.
    }
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage, t: (key: MessageKey) => messages[language][key] }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("LanguageProvider is missing.");
  return value;
}

export function LocalizedText({ id }: { id: MessageKey }) {
  const { t } = useLanguage();
  return <>{t(id)}</>;
}
