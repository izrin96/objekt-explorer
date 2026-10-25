import { type ActionEmailProps, Layout, Paragraph } from "../layout";

export { previewProps } from "./preview";
export const templateName = "delete-account";

export function Template(props: ActionEmailProps) {
  return (
    <Layout
      {...props}
      preview={`Confirm that you want to delete your ${props.site.name} account.`}
      heading="Delete your account"
      action="Delete account"
      expiry="The link expires in 24 hours."
      footer="If you didn't ask to delete your account, you can ignore this email and your account stays as it is."
    >
      <Paragraph>
        You asked to delete your {props.site.name} account. This removes your profile, lists and
        linked wallets, and cancels your open offers. Your past trades stay in the other trader's
        history.
      </Paragraph>
      <Paragraph>This can't be undone.</Paragraph>
    </Layout>
  );
}
