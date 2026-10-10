import type { Outputs } from "@repo/api";

import { m } from "@/paraglide/messages";

export type Account = Outputs["moderation"]["account"];
type Person = Account["reports"][number]["reporter"];

export const sectionTitle = "text-muted-foreground text-xs font-medium tracking-wide uppercase";

export function personName(person: Person) {
  return person?.identity?.name ?? m.mod_person_gone();
}
