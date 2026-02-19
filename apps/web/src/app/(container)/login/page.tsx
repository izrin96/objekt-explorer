import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import SignIn from "@/components/auth/sign-in";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("page_titles");
  return {
    title: t("login"),
  };
}

export default async function SignInPage() {
  return <SignIn />;
}
