import type { Metadata } from "next";
import { useIntlayer } from "next-intlayer/server";

import SignIn from "@/components/auth/sign-in";

export async function generateMetadata(): Promise<Metadata> {
  const content = useIntlayer("page_titles");
  return {
    title: content.login.value,
  };
}

export default async function SignInPage() {
  return <SignIn />;
}
