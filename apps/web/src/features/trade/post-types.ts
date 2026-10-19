import type { Outputs } from "@repo/api";

/** One row of Browse or For you: a person and every post the feed keeps for them. */
export type PersonData = Outputs["trade"]["people"]["people"][number];
export type PersonPostData = PersonData["posts"][number];
export type PostSideData = PersonPostData["sides"][number];
export type PostTag = PersonPostData["tag"];
