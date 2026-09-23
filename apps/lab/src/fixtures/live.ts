import { MEMBER_COLORS } from "@/components/filters/member-colors";
import { type LabArtist, objekts } from "@/fixtures/objekts";
import { hash, rng } from "@/lib/seeded";

/**
 * Cosmo live sessions, mirroring `LiveSession` in
 * `packages/cosmo/src/types/live.ts` minus the Stream fields the lab cannot
 * use (`videoCallId`, `chatChannelId`, `slowModeSecond`) — there is no stream
 * to join, so the detail page renders the app's own video *placeholder*.
 *
 * `startedAt` / `endedAt` are `Date`s rather than the API's ISO strings, like
 * every other lab fixture, and are measured from module load so the in-progress
 * duration starts somewhere plausible and then really ticks.
 */
export type LabLiveChannel = {
  /** a member, which is what a Cosmo channel is */
  name: string;
  /** the member's real Cosmo colour, the same value the objekt stripes use */
  primaryColorHex: string;
  profileImageUrl: string;
};

export type LabLiveSession = {
  id: string;
  title: string;
  thumbnailImage: string;
  startedAt: Date;
  endedAt: Date | null;
  status: "in_progress" | "ended";
  channel: LabLiveChannel;
  artist: LabArtist;
};

const TITLES = [
  "unboxing objekts with you",
  "good night talk ☾",
  "practice room check-in",
  "after the show",
  "quick hello before rehearsal",
  "comeback countdown",
  "answering your comments",
  "late night ramen",
];

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** the artists the fixture covers, in the order the tabs show them */
const ARTIST_ORDER: LabArtist[] = ["tripleS", "ARTMS", "idntt"];

/**
 * One collection per member, so a channel's avatar and its session thumbnails
 * are the member's own printed card. Insertion order is the fixture's order,
 * which keeps the pick stable.
 */
const collectionsByMember = new Map<string, { member: string; artist: LabArtist; image: string }>();
for (const objekt of objekts) {
  if (objekt.frontImage === "" || collectionsByMember.has(objekt.member)) continue;
  collectionsByMember.set(objekt.member, {
    member: objekt.member,
    artist: objekt.artist,
    image: objekt.frontImage,
  });
}

function membersOf(artist: LabArtist): { member: string; image: string }[] {
  return [...collectionsByMember.values()].filter((m) => m.artist === artist);
}

function build(): LabLiveSession[] {
  const now = Date.now();
  const sessions: LabLiveSession[] = [];

  for (const artist of ARTIST_ORDER) {
    const members = membersOf(artist);
    if (members.length === 0) continue;

    const next = rng(hash(`live:${artist}`));
    const count = 3 + Math.floor(next() * 3); // 3–5, per the brief
    for (let i = 0; i < count; i++) {
      const member = members[Math.floor(next() * members.length)];
      if (!member) continue;
      const title = TITLES[Math.floor(next() * TITLES.length)] ?? "live now";

      // only two of the three artists carry a live session, so the tabs cover
      // both the "watch now" and the all-ended case without a special fixture
      const live = artist !== "idntt" && i === 0;
      const startedAt = live
        ? new Date(now - (20 + Math.floor(next() * 70)) * MINUTE)
        : new Date(now - (i + 1) * 19 * HOUR - Math.floor(next() * 6) * HOUR);

      sessions.push({
        id: `${artist.toLowerCase()}-${i + 1}`,
        title: `${member.member} · ${title}`,
        thumbnailImage: member.image,
        startedAt,
        endedAt: live
          ? null
          : new Date(startedAt.getTime() + (40 + Math.floor(next() * 80)) * MINUTE),
        status: live ? "in_progress" : "ended",
        channel: {
          name: member.member,
          primaryColorHex: MEMBER_COLORS[member.member] ?? "currentColor",
          profileImageUrl: member.image,
        },
        artist,
      });
    }
  }

  return sessions;
}

export const liveSessions: LabLiveSession[] = build();

export const liveById: ReadonlyMap<string, LabLiveSession> = new Map(
  liveSessions.map((session) => [session.id, session]),
);

export function liveSessionsFor(artist: LabArtist): LabLiveSession[] {
  // newest first, the way the Cosmo endpoint returns them
  return liveSessions
    .filter((session) => session.artist === artist)
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
}
