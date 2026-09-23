import { CaretRightIcon, NoteIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { m } from "@/paraglide/messages";

import { DISCORD_INVITE } from "./about";

/**
 * Release notes are a dated record of what shipped, not product chrome, so they
 * stay in the language they were written in — `apps/website` carries the same
 * array verbatim. Everything around them goes through `m.*`.
 */
const CHANGELOG = [
  {
    date: "2026-09-23",
    items: ["Redesigned the whole site."],
  },
  {
    date: "2026-09-16",
    items: [
      "Added Japanese (日本語) language. Switch to it in Settings. Thanks to たろう (@iddnntt) from X.",
    ],
  },
  {
    date: "2026-09-14",
    items: [
      "Added a Marketplace page showing all objekts listed in discoverable Sale lists, with floor price and number of objekts listed.",
      "Filter by priced only or floor price range, and sort by lowest price, recently listed, or most listed.",
      "The Market tab in the Objekt view now shows floor price, objekts listed, and seller count.",
      "Pick a preferred currency in Settings. Marketplace prices are converted into it instead of USD.",
    ],
  },
  {
    date: "2026-08-27",
    items: [
      "Unit objekts are now recognized by each individual member, not just the combined name. Filtering and searching by a member includes the unit objekts that member appears in.",
      "(Note: This affects Progress, as unit objekts now count toward each member's total.)",
    ],
  },
  {
    date: "2026-06-02",
    items: [
      "Trade Matches now works with standalone Have or Want lists. No pairing required. Each list can independently find matches in one direction (Have→Want or Want→Have).",
      "Paired Have+Want lists get a new mode selector in the Trade Matches: Have only, Both, or Want only. Both mode matches your paired Have+Want against other users' paired Have+Want.",
      "Want lists can now be marked as Discoverable (no profile binding needed, except Have list).",
      "(Note: Trade matching require the partner's list to be discoverable.)",
    ],
  },
  {
    date: "2026-05-31",
    items: ["Profile banner now extends slightly outside the container."],
  },
  {
    date: "2026-05-29",
    items: [
      "Refactored list types for better user-friendliness: General, Sale, Have, and Want.",
      'Added a Trade Matches feature: This is enabled after linking a paired Have/Want list. Objekts added to your Have/Want list will only match with users who have enabled the "Discoverable" option. (Note: Discoverable mode requires Cosmo profile binding).',
      "Profile-bound Sale and Have lists can now hide serial numbers.",
      'Added a Market tab to the Objekt view. Objekts must be added to a Sale list with the "Discoverable" option enabled. Prices in the Market are automatically converted to USD for now.',
    ],
  },
  {
    date: "2026-04-20 - 2026-04-23",
    items: [
      "Added move pin order. You can now move your objekt pin.",
      "Added export button to list view to export as csv file. This could be useful in future to import into third party service like Apollo.",
      "Added member emoji option in Generate Discord format.",
    ],
  },
  {
    date: "2026-04-10",
    items: ["Added sorting by Rarity. Mint counts are updated hourly."],
  },
  {
    date: "2026-04-06",
    items: [
      "Added a Compare button to the list view. You can now compare the current list with your profile or another list. Note: This is an early implementation, UX is still being refined.",
    ],
  },
] as const;

/** The nav's entry point: an icon button that owns the dialog beside it. */
export function ChangelogButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={m.common_changelog()}
        className={className}
        onClick={() => setOpen(true)}
      >
        <NoteIcon />
      </Button>
      <ChangelogDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function ChangelogDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">{m.common_changelog()}</DialogTitle>
          <DialogDescription className="sr-only">{m.about_discord_invite()}</DialogDescription>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-4">
          <p className="bg-secondary/60 rounded-lg border px-3 py-2.5 text-sm">
            {m.about_discord_invite()}{" "}
            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              discord.gg/SWEm6RbJD3
            </a>
          </p>

          <div className="flex flex-col divide-y rounded-lg border">
            {CHANGELOG.map((entry, index) => (
              /* `<details>` rather than a rebuilt disclosure: it already
                  toggles on Enter and Space and announces its expanded state */
              <details key={entry.date} open={index === 0} className="group px-3 py-2.5">
                <summary className="focus-visible:ring-ring flex cursor-pointer items-center gap-2 rounded-sm font-mono text-sm outline-none focus-visible:ring-2">
                  <CaretRightIcon
                    aria-hidden
                    className="size-3.5 shrink-0 transition-transform group-open:rotate-90"
                  />
                  {entry.date}
                </summary>
                <ul className="text-muted-foreground mt-2 ml-5.5 list-outside list-disc text-sm leading-6">
                  {entry.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{m.common_modal_close()}</DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
