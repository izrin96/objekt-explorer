import LinkRender from "@/components/link/link-process";
import { cachedSession } from "@/lib/server/auth";
import { redirect } from "next/navigation";
import React from "react";

export default async function Page() {
  const session = await cachedSession();

  if (!session) redirect("/");

  return (
    <div className="flex flex-col pb-8 pt-2">
      <LinkRender />
    </div>
  );
}
