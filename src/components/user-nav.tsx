"use client";

import { authClient } from "@/lib/auth-client";
import React from "react";
import { Avatar, buttonStyles, Menu, Link } from "./ui";
import { redirect } from "next/navigation";

export default function UserNav() {
  const { data, isPending } = authClient.useSession();

  if (isPending) return;

  return (
    <div className="text-sm gap-2 inline-flex">
      {data ? (
        <UserMenu />
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

function UserMenu() {
  const { data } = authClient.useSession();

  if (!data) return;

  return (
    <Menu>
      <Menu.Trigger aria-label="Open Menu">
        <Avatar
          alt="cobain"
          size="medium"
          shape="square"
          src={data.user.image}
        />
      </Menu.Trigger>
      <Menu.Content placement="bottom right" className="sm:min-w-56">
        <Menu.Section>
          <Menu.Header separator>
            <span className="block">{data.user.name}</span>
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
