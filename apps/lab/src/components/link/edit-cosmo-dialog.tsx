import { Link } from "@tanstack/react-router";
import { type ReactElement, useState } from "react";

import { BannerField } from "@/components/shared/banner-field";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toastManager } from "@/components/ui/toast";
import type { LabBanner } from "@/fixtures/banners";
import { type CosmoLink, useCosmoLinks, VALID_COLUMNS } from "@/store/link";

/** the lab's stand-in for `SITE_NAME` */
const SITE_NAME = "Objekt Tracker";

type FlagKey = "hideUser" | "hideNickname" | "privateSerial" | "hideTransfer" | "privateProfile";

/** the five privacy flags `profile.edit` writes, in the app's order and copy */
const FLAGS: { key: FlagKey; label: string; description: string }[] = [
  {
    key: "hideUser",
    label: "Hide User",
    description: `Hide ${SITE_NAME} account from Cosmo profile`,
  },
  {
    key: "hideNickname",
    label: "Hide Cosmo ID",
    description: "Hide Cosmo ID from Activity, Activity History, Serial Lookup and your profile.",
  },
  {
    key: "privateSerial",
    label: "Hide from Serial Lookup",
    description: "Prevent others from finding your objekt via serial number. Only you can see it.",
  },
  {
    key: "hideTransfer",
    label: "Hide Activity History",
    description: "Hide your profile Activity History. Only you can see it.",
  },
  {
    key: "privateProfile",
    label: "Private Profile",
    description: "Make your Cosmo profile private. Only you can see it.",
  },
];

const NOT_SET = "0";

/**
 * Port of `link/modal/edit-profile-modal.tsx` — the app's one edit-profile
 * modal, opened both from the profile header and from the `/link` card. The
 * Cosmo ID comes from Cosmo and is not editable: it appears in the description
 * only, exactly as the app has it.
 *
 * The app renders the flags as checkbox + description rows in a Sheet; Base UI
 * has no checkbox field with a description slot, so each flag is a labelled
 * Switch with the same helper text, which is how the rest of the lab already
 * writes a boolean setting.
 *
 * `fallbackBanner` is what the caller is currently showing when the store has
 * no banner of its own (the profile header's fixture media), so the preview
 * matches the page and "Remove" can clear it.
 */
export function EditCosmoDialog({
  link,
  fallbackBanner = null,
  showUnlinkNote = true,
  children,
}: {
  link: CosmoLink;
  fallbackBanner?: LabBanner | null;
  /** the app always shows it; a link to the page you are already on is noise */
  showUnlinkNote?: boolean;
  children: ReactElement;
}) {
  const edit = useCosmoLinks((s) => s.edit);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(link);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(link);
        setOpen(next);
      }}
    >
      <DialogTrigger render={children} />
      <DialogPopup className="max-w-md">
        <form
          className="contents"
          onSubmit={(e) => {
            e.preventDefault();
            edit(link.address, {
              hideUser: draft.hideUser,
              hideNickname: draft.hideNickname,
              privateSerial: draft.privateSerial,
              hideTransfer: draft.hideTransfer,
              privateProfile: draft.privateProfile,
              gridColumns: draft.gridColumns,
              banner: draft.banner,
            });
            setOpen(false);
            toastManager.add({ type: "success", title: "Cosmo profile updated" });
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-display">Edit Profile</DialogTitle>
            <DialogDescription>
              Currently editing <span className="text-foreground">{link.nickname}</span> Cosmo
              profile
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className="flex flex-col gap-4">
            {FLAGS.map((flag) => (
              <Label key={flag.key} className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 flex-col gap-0.5">
                  {flag.label}
                  <span className="text-muted-foreground text-xs font-normal text-pretty">
                    {flag.description}
                  </span>
                </span>
                <Switch
                  checked={draft[flag.key]}
                  onCheckedChange={(checked) => setDraft({ ...draft, [flag.key]: checked })}
                />
              </Label>
            ))}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ec-columns">Objekt Columns</Label>
              <span className="text-muted-foreground text-xs text-pretty">
                Number of columns to apply on visit. Visitor are still allowed to change to any
                columns they want.
              </span>
              <Select
                value={draft.gridColumns === null ? NOT_SET : String(draft.gridColumns)}
                onValueChange={(v) =>
                  setDraft({
                    ...draft,
                    gridColumns: v === null || v === NOT_SET ? null : Number(v),
                  })
                }
              >
                <SelectTrigger id="ec-columns" className="w-38">
                  <SelectValue>
                    {(value) => (value === NOT_SET ? "Not set" : `${value} columns`)}
                  </SelectValue>
                </SelectTrigger>
                <SelectPopup>
                  <SelectItem value={NOT_SET}>Not set</SelectItem>
                  {VALID_COLUMNS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} columns
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>

            <BannerField
              id="ec-banner"
              banner={draft.banner === undefined ? fallbackBanner : draft.banner}
              onChange={(banner) => setDraft({ ...draft, banner })}
            />

            {showUnlinkNote && (
              <span className="text-muted-foreground text-xs text-pretty">
                To unlink this Cosmo profile from your account, visit{" "}
                <Link to="/link" className="underline underline-offset-2">
                  Manage Cosmo link
                </Link>{" "}
                page.
              </span>
            )}
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
