"use client";

import { useState } from "react";
import { Button } from "../ui";
import { cn } from "@/utils/classes";
import { authClient } from "@/lib/auth-client";
import { IconBrandDiscord } from "@intentui/icons";

export default function SignIn() {
  const [loading, setLoading] = useState(false);

  return (
    <>
      <div className="grid gap-4">
        <div
          className={cn(
            "w-full gap-2 flex items-center",
            "justify-between flex-col"
          )}
        >
          <Button
            intent="primary"
            className={cn("w-full gap-2")}
            isDisabled={loading}
            onClick={async () => {
              await authClient.signIn.social(
                {
                  provider: "discord",
                },
                {
                  onRequest: (ctx) => {
                    setLoading(true);
                  },
                  onResponse: (ctx) => {
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
    </>
  );
}
