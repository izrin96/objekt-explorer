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
import { BlockedUsersSection } from "@/features/account/account-dialog/blocked";
import { DangerSection } from "@/features/account/account-dialog/danger";
import { GeneralSection } from "@/features/account/account-dialog/general";
import { LinkedAccountsSection } from "@/features/account/account-dialog/linked-accounts";
import { MessagesSection } from "@/features/account/account-dialog/messages";
import { NotificationsSection } from "@/features/account/account-dialog/notifications";
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
        {user ? (
          /* the strip is a sibling of the scrolling panel, not inside it: in
             the panel it scrolls out of the dialog and there is no way back to
             another section. It wraps rather than scrolls, so every tab is in view */
          <Tabs defaultValue="general" className="min-h-0 gap-0">
            {/* `shrink-0` so the flex column cannot squeeze the strip below the list */}
            <div className="mx-6 shrink-0 border-b">
              {/* the shared indicator cannot follow a wrapped row, so the active tab draws its own */}
              <TabsList
                variant="underline"
                className="w-full flex-wrap justify-start *:data-[slot=tab-indicator]:hidden *:data-[slot=tabs-tab]:grow-0 *:data-[slot=tabs-tab]:rounded-none *:data-[slot=tabs-tab]:data-active:shadow-[inset_0_-2px_0_var(--color-primary)]"
              >
                <TabsTab value="general">{m.auth_account_general()}</TabsTab>
                <TabsTab value="notifications">{m.notification_section()}</TabsTab>
                <TabsTab value="messages">{m.chat_settings_tab()}</TabsTab>
                <TabsTab value="blocked">{m.mod_blocked_tab()}</TabsTab>
                <TabsTab value="linked">{m.auth_account_social_link()}</TabsTab>
                {hasPassword && (
                  <TabsTab value="password">{m.auth_account_change_password()}</TabsTab>
                )}
                <TabsTab value="danger">{m.auth_account_danger_zone()}</TabsTab>
              </TabsList>
            </div>

            <DialogPanel className="pt-4!">
              <TabsPanel value="general">
                <GeneralSection user={user} />
              </TabsPanel>

              <TabsPanel value="notifications">
                <NotificationsSection />
              </TabsPanel>

              <TabsPanel value="messages">
                <MessagesSection />
              </TabsPanel>

              <TabsPanel value="blocked">
                <BlockedUsersSection />
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
            </DialogPanel>
          </Tabs>
        ) : null}
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
