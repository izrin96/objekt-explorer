import { api } from "@/lib/trpc/server";
import { Metadata } from "next";
import Link from "next/link";
import React from "react";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `My List`,
  };
}

export default async function Page() {
  const lists = await api.list.list();

  return (
    <div>
      <div className="flex flex-col w-full">
        <div className="text-xl font-semibold">My List</div>
      </div>
      <div className="flex flex-col gap-2">
        {lists.map((list) => (
          <Link href={`/list/${list.slug}`} key={list.slug}>
            {list.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
