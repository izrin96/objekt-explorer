import { type ActionEmailProps, Layout, Paragraph } from "../layout";

export { previewProps } from "./preview";
export const templateName = "reset-password";

export function Template(props: ActionEmailProps) {
  return (
    <Layout
      {...props}
      preview={`Choose a new password for your ${props.site.name} account.`}
      heading="Reset your password"
      action="Reset password"
      expiry="The link expires in 1 hour."
      footer="If you didn't ask to reset your password, you can ignore this email. Your password stays the same."
    >
      <Paragraph>
        Someone asked to reset the password for your {props.site.name} account. Choose a new one
        with the button below.
      </Paragraph>
    </Layout>
  );
}
