import { createContext, useContext, type ReactNode } from "react";

import enMessages from "../../../messages/en.json";

type Messages = typeof enMessages;

const I18nContext = createContext<{
  messages: Messages;
  locale: string;
}>({
  messages: enMessages,
  locale: "en",
});

export function I18nProvider({
  children,
  locale = "en",
}: {
  children: ReactNode;
  locale?: string;
}) {
  return (
    <I18nContext.Provider value={{ messages: enMessages, locale }}>{children}</I18nContext.Provider>
  );
}

export function useLocale() {
  return useContext(I18nContext).locale;
}

export function useTranslations(namespace?: string) {
  const { messages } = useContext(I18nContext);

  return (key: string, values?: Record<string, string | number>) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    const keys = fullKey.split(".");
    let result: unknown = messages;

    for (const k of keys) {
      if (result && typeof result === "object" && k in result) {
        result = (result as Record<string, unknown>)[k];
      } else {
        return fullKey;
      }
    }

    if (typeof result !== "string") {
      return fullKey;
    }

    if (values) {
      return result.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? `{${k}}`));
    }

    return result;
  };
}

// Server-side translation function
export async function getTranslations({
  locale: _locale = "en",
  namespace,
}: {
  locale?: string;
  namespace?: string;
} = {}) {
  // In a full implementation, we'd load the correct locale's messages
  // For now, we use the English messages
  const messages = enMessages;

  return (key: string, values?: Record<string, string | number>) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    const keys = fullKey.split(".");
    let result: unknown = messages;

    for (const k of keys) {
      if (result && typeof result === "object" && k in result) {
        result = (result as Record<string, unknown>)[k];
      } else {
        return fullKey;
      }
    }

    if (typeof result !== "string") {
      return fullKey;
    }

    if (values) {
      return result.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? `{${k}}`));
    }

    return result;
  };
}
