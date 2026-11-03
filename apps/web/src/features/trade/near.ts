import type { NearVerb, SideNear } from "@repo/api/schemas/trade";
import type { ValidObjekt } from "@repo/lib/types/objekt";

export type { NearVerb, SideNear };

/** What the objekt drawer needs to say why a near match isn't counted, and to fix it. */
export type NearOpen = {
  verb: NearVerb;
  /** their list's role: a want list's near match is the viewer's copy, any other the viewer's want */
  role: "have" | "want" | "sale";
  theirList: string;
  /** the viewer's lists holding it */
  myListIds: readonly number[];
  /** the person, once the row adds it */
  person?: string;
  /** opens the offer builder on the row's post with this objekt added, where the row offers one */
  makeOffer?: () => void;
};

/** Opens an objekt from a strip or a dialog, with its near match when it is one. */
export type OpenObjekt = (objekt: ValidObjekt, near?: NearOpen) => void;
