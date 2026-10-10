import type { DeleteRefusal } from "@repo/api/schemas/user";
import { useQuery } from "@tanstack/react-query";

import { AccountSection } from "@/features/account/account-nav";
import { accountsOptions } from "@/features/account/queries";
import { BlockedUsersSection } from "@/features/account/sections/blocked";
import { DangerSection } from "@/features/account/sections/danger";
import { GeneralSection } from "@/features/account/sections/general";
import { LinkedAccountsSection } from "@/features/account/sections/linked-accounts";
import { MessagesSection } from "@/features/account/sections/messages";
import { NotificationsSection } from "@/features/account/sections/notifications";
import { PasswordSection } from "@/features/account/sections/password";
import { SectionStatus } from "@/features/account/sections/section-status";
import { HiddenPartnersList } from "@/features/trade/hidden-partners-dialog";
import { useCurrentUser } from "@/features/user/hooks";
import { m } from "@/paraglide/messages";

export function GeneralPanel() {
  const { data } = useCurrentUser();
  return (
    <AccountSection title={m.auth_account_general()}>
      {data?.user ? <GeneralSection user={data.user} /> : null}
    </AccountSection>
  );
}

export function NotificationsPanel() {
  return (
    <AccountSection title={m.notification_section()} description={m.notification_section_desc()}>
      <NotificationsSection />
    </AccountSection>
  );
}

export function MessagesPanel() {
  return (
    <AccountSection title={m.chat_settings_tab()}>
      <MessagesSection />
    </AccountSection>
  );
}

export function BlockedPanel() {
  return (
    <AccountSection title={m.mod_blocked_title()} description={m.mod_blocked_desc()}>
      <BlockedUsersSection />
    </AccountSection>
  );
}

export function HiddenPanel() {
  return (
    <AccountSection
      title={m.trade_hidden_partners()}
      description={m.trade_hidden_partners_description()}
    >
      <HiddenPartnersList enabled />
    </AccountSection>
  );
}

export function SignInPanel() {
  const accounts = useQuery(accountsOptions);
  return (
    <AccountSection title={m.account_section_sign_in()}>
      {accounts.data ? (
        <LinkedAccountsSection accounts={accounts.data} />
      ) : (
        <SectionStatus error={accounts.error} />
      )}
    </AccountSection>
  );
}

export function PasswordPanel() {
  return (
    <AccountSection title={m.auth_account_change_password()}>
      <PasswordSection />
    </AccountSection>
  );
}

export function DangerPanel({ refused }: { refused: DeleteRefusal | null }) {
  return (
    <AccountSection title={m.auth_account_danger_zone()}>
      <DangerSection refused={refused} />
    </AccountSection>
  );
}
