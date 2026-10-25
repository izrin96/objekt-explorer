import { type ActionEmailProps, Layout, Paragraph } from "../layout";

export { previewProps } from "./preview";
export const templateName = "verify-email";

export function Template(props: ActionEmailProps) {
  return (
    <Layout
      {...props}
      preview={`Confirm this email address for your ${props.site.name} account.`}
      heading="Verify your email"
      action="Verify email"
      expiry="The link expires in 1 hour."
      footer="If you didn't ask for this, you can ignore this email."
    >
      <Paragraph>
        Confirm that this is the email address for your {props.site.name} account.
      </Paragraph>
    </Layout>
  );
}
