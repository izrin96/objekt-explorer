import type { ObjektCardInput, PostCardInput, PostCardView } from "@repo/api/schemas/chat";
import type { ListType } from "@repo/api/schemas/list";
import type { ValidObjekt } from "@repo/lib/types/objekt";

/** An objekt card waiting in the message box, sent with the next message. */
export type ObjektAttachment = {
  kind: "objekt";
  input: ObjektCardInput;
  objekt: ValidObjekt;
  listName: string | null;
  /** the type of the other person's list it came from, when a Message button attached it */
  listType?: ListType;
};

/** A Trade post card waiting in the message box; `view` carries the match the server saved for it. */
export type PostAttachment = {
  kind: "post";
  input: PostCardInput;
  view: PostCardView;
  collections: Readonly<Record<string, ValidObjekt>>;
};

export type Attachment = ObjektAttachment | PostAttachment;
