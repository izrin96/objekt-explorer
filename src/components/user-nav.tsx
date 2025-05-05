"use client";

import { authClient } from "@/lib/auth-client";
import React from "react";
import { Avatar, buttonStyles, Menu, Link } from "./ui";
import { redirect, usePathname } from "next/navigation";
import { User } from "better-auth";

export default function UserNav() {
  // temporary fix for ui being stuck after navigate
  const pathname = usePathname();
  const { data, isPending } = authClient.useSession();

  if (isPending) return;

  return (
    <div className="text-sm gap-2 inline-flex">
      {data ? (
        <UserMenu key={pathname} user={data.user} />
      ) : (
        <>
          <Link
            href="/login"
            className={buttonStyles({ intent: "outline", size: "small" })}
          >
            Login
          </Link>
        </>
      )}
    </div>
  );
}

function UserMenu({ user }: { user: User }) {
  return (
    <Menu>
      <Menu.Trigger aria-label="Open Menu">
        <Avatar alt="cobain" size="medium" shape="square" src={user.image} />
      </Menu.Trigger>
      <Menu.Content placement="bottom right" className="sm:min-w-56">
        <Menu.Section>
          <Menu.Header separator>
            <span className="block">{user.name}</span>
          </Menu.Header>
        </Menu.Section>
        <Menu.Item href="/list">My List</Menu.Item>
        <Menu.Separator />
        <Menu.Item
          onAction={async () => {
            await authClient.signOut();
            redirect("/");
          }}
        >
          Log out
        </Menu.Item>
      </Menu.Content>
    </Menu>
  );
}
