import { useState } from "react";

import { ForgotPassword } from "./forgot-password-form";
import { SignInForm } from "./sign-in-form";
import { SignUpForm } from "./sign-up-form";

export default function SignIn() {
  const [state, setState] = useState<"sign-in" | "sign-up" | "forgot-password">("sign-in");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex w-full max-w-md flex-col gap-6 self-center">
        {state === "sign-in" && <SignInForm setState={setState} />}
        {state === "sign-up" && <SignUpForm setState={setState} />}
        {state === "forgot-password" && <ForgotPassword setState={setState} />}
      </div>
    </div>
  );
}
