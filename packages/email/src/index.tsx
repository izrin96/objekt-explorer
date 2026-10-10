import { render } from "jsx-email";
import type { ReactElement } from "react";

import type { ActionEmailProps } from "./layout";
import { Template as DeleteAccount } from "./templates/delete-account";
import { Template as ResetPassword } from "./templates/reset-password";
import { Template as VerifyEmail } from "./templates/verify-email";

export type { ActionEmailProps, Site } from "./layout";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

async function renderEmail(subject: string, element: ReactElement): Promise<RenderedEmail> {
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { subject, html, text };
}

export const verifyEmail = (props: ActionEmailProps) =>
  renderEmail("Verify your email", <VerifyEmail {...props} />);

export const resetPassword = (props: ActionEmailProps) =>
  renderEmail("Reset your password", <ResetPassword {...props} />);

export const deleteAccount = (props: ActionEmailProps) =>
  renderEmail("Confirm deleting your account", <DeleteAccount {...props} />);
