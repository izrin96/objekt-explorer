import SignIn from "@/components/auth/sign-in";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Sign In",
  };
}

export default async function SignInPage() {
  return <SignIn />;
}
