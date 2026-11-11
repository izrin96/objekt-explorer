import { InfoIcon, NoteIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { CornerDot } from "@/components/shared/unread-badge";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { m } from "@/paraglide/messages";

import { AboutDialog } from "./about";
import { CHANGELOG } from "./changelog-entries";
import { useChangelogNew } from "./use-changelog-new";

/** Not `::after` on the corner: Button spends it on the touch target. */
export function NewDot({ placement }: { placement: "corner" | "inline" }) {
  if (placement === "corner") return <CornerDot />;
  return <span aria-hidden className="bg-accent-solid size-2 shrink-0 rounded-full" />;
}

/** The nav's entry point: an icon button that owns the dialog beside it. */
export function ChangelogButton() {
  const [open, setOpen] = useState(false);
  const { isNew, label, markSeen } = useChangelogNew();

  return (
    <>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={label}
        onClick={() => {
          markSeen();
          setOpen(true);
        }}
      >
        <NoteIcon />
        {isNew ? <NewDot placement="corner" /> : null}
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
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">{m.common_changelog()}</DialogTitle>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-4">
          {/* hiddenUntilFound keeps shut entries in the DOM, so find-in-page still reaches them */}
          <Accordion
            multiple
            hiddenUntilFound
            defaultValue={[CHANGELOG[0].date]}
            className="rounded-lg border"
          >
            {CHANGELOG.map((entry) => (
              <AccordionItem key={entry.date} value={entry.date} className="px-3">
                <AccordionTrigger className="py-2.5 font-mono font-normal">
                  {entry.date}
                </AccordionTrigger>
                <AccordionPanel className="pb-2.5">
                  <ul className="ml-5.5 list-outside list-disc leading-6">
                    {entry.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        </DialogPanel>
        <DialogFooter>
          <Button variant="outline" className="sm:mr-auto" onClick={() => setAboutOpen(true)}>
            <InfoIcon />
            {m.nav_about()}
          </Button>
          <DialogClose render={<Button variant="outline" />}>{m.common_modal_close()}</DialogClose>
        </DialogFooter>
      </DialogPopup>
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </Dialog>
  );
}
