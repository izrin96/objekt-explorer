import { useState } from "react";

import { DangerSection } from "@/components/account/account-dialog/danger";
import { GeneralSection } from "@/components/account/account-dialog/general";
import { LinkedAccountRow } from "@/components/account/account-dialog/linked-accounts";
import { PasswordSection } from "@/components/account/account-dialog/password";
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
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { toastManager } from "@/components/ui/toast";
import type { Account } from "@/store/account";

/**
 * Port of `auth/account/user-account.tsx` + `link-account.tsx`. The website
 * stacks these as an intentui DisclosureGroup inside a Sheet; four sections in
 * one column got long, so the lab splits them across Base UI Tabs and keeps it
 * a single dialog. Only General is a form — the other sections act on their
 * own, exactly as the website's separate mutations do.
 */
export function AccountDialog({
  account,
  onSave,
  open,
  onOpenChange,
}: {
  account: Account;
  onSave: (next: Account) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [draft, setDraft] = useState(account);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(account);
        onOpenChange(next);
      }}
    >
      <DialogPopup className="max-w-lg">
        <form
          className="contents"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(draft);
            onOpenChange(false);
            toastManager.add({ type: "success", title: "Account updated" });
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-display">Account</DialogTitle>
            <DialogDescription>
              Your display name, avatar, linked accounts and password.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <Tabs defaultValue="general">
              <TabsList variant="underline" className="mb-4 w-full justify-start border-b">
                <TabsTab value="general">General</TabsTab>
                <TabsTab value="linked">Linked accounts</TabsTab>
                <TabsTab value="password">Password</TabsTab>
                <TabsTab value="danger">Danger zone</TabsTab>
              </TabsList>

              <TabsPanel value="general">
                <GeneralSection draft={draft} onChange={setDraft} />
              </TabsPanel>

              <TabsPanel value="linked">
                <div className="flex flex-col gap-3">
                  <LinkedAccountRow
                    provider="discord"
                    handle={draft.discord}
                    onChange={(discord) => setDraft({ ...draft, discord })}
                  />
                  <LinkedAccountRow
                    provider="x"
                    handle={draft.twitter}
                    onChange={(twitter) => setDraft({ ...draft, twitter })}
                  />
                </div>
              </TabsPanel>

              <TabsPanel value="password">
                <PasswordSection
                  hasPassword={draft.hasPassword}
                  onSet={() => setDraft({ ...draft, hasPassword: true })}
                />
              </TabsPanel>

              <TabsPanel value="danger">
                <DangerSection name={account.name} />
              </TabsPanel>
            </Tabs>
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
