"use client";

import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import React from "react";

export default function UserNav() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return;

  return (
    <div className="text-sm gap-2 inline-flex">
      {session ? (
        <>
          <span>{session.user.name}</span>
          <a href="#" onClick={() => authClient.signOut()}>
            Logout
          </a>
        </>
      ) : (
        <>
          <Link href="/sign-in">Login</Link>
        </>
      )}
    </div>
  );
}
