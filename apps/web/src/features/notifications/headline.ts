/** Stands in for the partner's name, so the row can bold it wherever a language puts it. */
export const PARTNER_TOKEN = "⁣partner⁣";

/** The text around the first `token`; `null` when the text does not hold it. */
export function splitAround(text: string, token: string) {
  const at = text.indexOf(token);
  if (at === -1) return null;
  return { before: text.slice(0, at), after: text.slice(at + token.length) };
}
