import { useQuery } from "@tanstack/react-query";

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
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { DangerSection } from "@/features/account/account-dialog/danger";
import { GeneralSection } from "@/features/account/account-dialog/general";
import { LinkedAccountsSection } from "@/features/account/account-dialog/linked-accounts";
import { PasswordSection } from "@/features/account/account-dialog/password";
import { accountsOptions } from "@/features/account/queries";
import { useCurrentUser } from "@/features/user/hooks";
import { m } from "@/paraglide/messages";

/** Only General is a form; every other section acts on its own, so the footer closes. */
export function AccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: currentUser } = useCurrentUser();
  const accounts = useQuery(accountsOptions);
  const user = currentUser?.user;
  const hasPassword = accounts.data?.some((a) => a.providerId === "credential") ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">{m.auth_account_title()}</DialogTitle>
          <DialogDescription>{m.auth_account_description()}</DialogDescription>
        </DialogHeader>
        <DialogPanel>
          {user ? (
            <Tabs defaultValue="general">
              {/* four labels do not fit a phone; the strip scrolls rather than
                  widening the dialog's panel */}
              <TabsList
                variant="underline"
                data-scroll-x
                className="mb-4 w-full justify-start overflow-x-auto border-b"
              >
                <TabsTab value="general">{m.auth_account_general()}</TabsTab>
                <TabsTab value="linked">{m.auth_account_social_link()}</TabsTab>
                {hasPassword && (
                  <TabsTab value="password">{m.auth_account_change_password()}</TabsTab>
                )}
                <TabsTab value="danger">{m.auth_account_danger_zone()}</TabsTab>
              </TabsList>

              <TabsPanel value="general">
                <GeneralSection user={user} />
              </TabsPanel>

              <TabsPanel value="linked">
                {accounts.data ? (
                  <LinkedAccountsSection accounts={accounts.data} />
                ) : (
                  <SectionStatus error={accounts.error} />
                )}
              </TabsPanel>

              {hasPassword && (
                <TabsPanel value="password">
                  <PasswordSection />
                </TabsPanel>
              )}

              <TabsPanel value="danger">
                <DangerSection />
              </TabsPanel>
            </Tabs>
          ) : null}
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{m.common_modal_close()}</DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

function SectionStatus({ error }: { error: Error | null }) {
  if (error) {
    return <p className="text-destructive-foreground text-sm">{error.message}</p>;
  }

  return (
    <div className="flex justify-center py-4">
      <Spinner className="size-5" />
    </div>
  );
}
