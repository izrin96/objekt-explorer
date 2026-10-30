import { CardsThreeIcon, HandshakeIcon, type Icon, PlusIcon } from "@phosphor-icons/react";
import { type RefObject, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { Sheet, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { m } from "@/paraglide/messages";

type AddChoice = { icon: Icon; label: string; description: string; run: () => void };

/**
 * One button for Attach objekt and Make offer: a menu from `md` up, where the conversation
 * list joins the thread, and a bottom sheet below it, with a line under each choice. What a
 * choice opens hands focus back to the button when it closes.
 */
export function AddToMessage({
  buttonRef,
  onAttach,
  onOffer,
}: {
  buttonRef: RefObject<HTMLButtonElement | null>;
  onAttach: () => void;
  onOffer: () => void;
}) {
  const wide = useMediaQuery("(min-width: 48rem)");
  const [sheetOpen, setSheetOpen] = useState(false);
  // a choice opens its dialog once the sheet has closed and handed focus back, or the sheet's
  // focus return lands on Add behind the new dialog
  const chosen = useRef<(() => void) | null>(null);
  const choices: AddChoice[] = [
    {
      icon: CardsThreeIcon,
      label: m.chat_attach_title(),
      description: m.chat_add_attach_desc(),
      run: onAttach,
    },
    {
      icon: HandshakeIcon,
      label: m.offer_composer(),
      description: m.chat_add_offer_desc(),
      run: onOffer,
    },
  ];
  // the same height as Send, so the row lines up with a one-line message box
  const button = (
    <Button
      ref={buttonRef}
      variant="ghost"
      size="icon"
      aria-label={m.chat_add_to_message()}
      title={m.chat_add_to_message()}
      className="shrink-0"
    />
  );

  if (wide) {
    return (
      <Menu>
        <MenuTrigger render={button}>
          <PlusIcon />
        </MenuTrigger>
        <MenuPopup side="top" align="start">
          {choices.map(({ icon: ChoiceIcon, label, run }) => (
            <MenuItem key={label} onClick={run}>
              <ChoiceIcon />
              {label}
            </MenuItem>
          ))}
        </MenuPopup>
      </Menu>
    );
  }

  return (
    <>
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        aria-label={m.chat_add_to_message()}
        aria-haspopup="dialog"
        aria-expanded={sheetOpen}
        onClick={() => setSheetOpen(true)}
        className="shrink-0"
      >
        <PlusIcon />
      </Button>
      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onOpenChangeComplete={(open) => {
          if (open) return;
          const run = chosen.current;
          chosen.current = null;
          run?.();
        }}
      >
        <SheetPopup side="bottom" finalFocus={buttonRef}>
          <SheetHeader>
            <SheetTitle className="font-display">{m.chat_add_to_message()}</SheetTitle>
          </SheetHeader>
          <SheetPanel className="flex flex-col gap-1 pt-0">
            {choices.map(({ icon: ChoiceIcon, label, description, run }) => (
              <Button
                key={label}
                variant="ghost"
                className="h-auto justify-start gap-3 py-3 text-start"
                onClick={() => {
                  chosen.current = run;
                  setSheetOpen(false);
                }}
              >
                <ChoiceIcon className="size-5" />
                <span className="flex flex-col">
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-muted-foreground text-xs font-normal">{description}</span>
                </span>
              </Button>
            ))}
          </SheetPanel>
        </SheetPopup>
      </Sheet>
    </>
  );
}
