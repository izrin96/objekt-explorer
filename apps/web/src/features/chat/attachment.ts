import type { CardInput } from "@repo/api/schemas/chat";
import type { ListTypeNew } from "@repo/api/schemas/list";
import type { ValidObjekt } from "@repo/lib/types/objekt";

/** An objekt card waiting in the message box, sent with the next message. */
export type Attachment = {
  input: CardInput;
  objekt: ValidObjekt;
  listName: string | null;
  /** the type of the other person's list it came from, when a Message button attached it */
  listType?: ListTypeNew;
};
