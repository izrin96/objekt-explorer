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

function resolveKey(messages: unknown, fullKey: string): string | undefined {
  const keys = fullKey.split(".");
  let result: unknown = messages;

  for (const k of keys) {
    if (result && typeof result === "object" && k in result) {
      result = (result as Record<string, unknown>)[k];
    } else {
      return undefined;
    }
  }

  return typeof result === "string" ? result : undefined;
}

function createTranslator(messages: unknown, namespace?: string) {
  const t = (key: string, values?: Record<string, string | number>) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    const result = resolveKey(messages, fullKey);

    if (!result) return fullKey;

    if (values) {
      return result.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? `{${k}}`));
    }

    return result;
  };

  t.rich = (
    key: string,
    values?: Record<string, string | number | ((chunks: ReactNode) => ReactNode)>,
  ) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    const result = resolveKey(messages, fullKey);

    if (!result) return fullKey;

    if (!values) return result;

    const parts: ReactNode[] = [];
    let lastIndex = 0;
    const regex = /<(\w+)>(.*?)<\/\1>/gs;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(result)) !== null) {
      if (match.index > lastIndex) {
        parts.push(result.slice(lastIndex, match.index));
      }

      const tag = match[1]!;
      const content = match[2]!;
      const value = values[tag];

      if (typeof value === "function") {
        parts.push(value(content));
      } else if (value !== undefined) {
        parts.push(String(value));
      } else {
        parts.push(content);
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < result.length) {
      parts.push(result.slice(lastIndex));
    }

    return parts.length > 0 ? parts : result;
  };

  return t;
}

export function useTranslations(namespace?: string) {
  const { messages } = useContext(I18nContext);
  return createTranslator(messages, namespace);
}

// Server-side translation function
export async function getTranslations({
  locale: _locale = "en",
  namespace,
}: {
  locale?: string;
  namespace?: string;
} = {}) {
  const messages = enMessages;
  return createTranslator(messages, namespace);
}
