import { auth } from "@/lib/server/auth";
import { headers } from "next/headers";
import Link from "next/link";
import React from "react";

export default async function UserNav() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return (
      <div>
        <Link href="/sign-in">Sign-in</Link>
      </div>
    );
  }

  return <div>{session.user.name}</div>;
}
