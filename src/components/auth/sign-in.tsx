"use client";

import { useState } from "react";
import { Button, Note } from "../ui";
import { cn } from "@/utils/classes";
import { authClient } from "@/lib/auth-client";
import { IconBrandDiscord } from "@intentui/icons";

export default function SignIn() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex flex-col py-6 gap-6">
      <Note intent="default">
        We&apos;re currently working on adding more login options, including
        email and password. In the meantime, logging in with Discord is
        completely safe. We only request basic information like your email
        address and never ask for anything beyond what's necessary.
      </Note>
      <div className="grid gap-4 max-w-xl w-full self-center">
        <Button
          intent="primary"
          className="gap-2"
          isDisabled={loading}
          onClick={async () => {
            await authClient.signIn.social(
              {
                provider: "discord",
              },
              {
                onRequest: () => {
                  setLoading(true);
                },
                onResponse: () => {
                  setLoading(false);
                },
              }
            );
          }}
        >
          <IconBrandDiscord />
          Sign in with Discord
        </Button>
      </div>
    </div>
  );
}
