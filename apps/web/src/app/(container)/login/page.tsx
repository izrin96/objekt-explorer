import type { Metadata } from "next";

import SignIn from "@/components/auth/sign-in";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Sign In",
  };
}

export default async function SignInPage() {
  return <SignIn />;
}
