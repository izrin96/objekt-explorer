"use client";

import { authClient } from "@/lib/auth-client";
import React, { useState } from "react";
import { Avatar, buttonStyles, Menu, Link, Modal, Form, Button } from "./ui";
import { redirect, usePathname } from "next/navigation";
import { User } from "@/lib/server/db/schema";
import { api } from "@/lib/trpc/client";
import { toast } from "sonner";

export default function UserNav() {
  // temporary fix for ui being stuck after navigate
  const pathname = usePathname();
  const { data, isPending } = authClient.useSession();

  if (isPending) return;

  return (
    <div className="text-sm gap-2 inline-flex">
      {data ? (
        <UserMenu key={pathname} user={data.user as User} />
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
    <PullDiscordProfile>
      {({ open: openRefreshProfile }) => (
        <Menu>
          <Menu.Trigger aria-label="Open Menu">
            <Avatar
              alt={user.name}
              initials={user.name.charAt(0)}
              size="medium"
              shape="square"
              src={user.image}
            />
          </Menu.Trigger>
          <Menu.Content placement="bottom right" className="sm:min-w-56">
            <Menu.Section>
              <Menu.Header separator>
                <span className="block">{user.name}</span>
                <span className="font-normal text-muted-fg">
                  {user.username}
                </span>
              </Menu.Header>
            </Menu.Section>
            <Menu.Item href="/list">My List</Menu.Item>
            <Menu.Item href="/link">My Cosmo ID</Menu.Item>
            <Menu.Item onAction={openRefreshProfile}>Refresh Profile</Menu.Item>
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
      )}
    </PullDiscordProfile>
  );
}

function PullDiscordProfile({
  children,
}: {
  children: ({ open }: { open: () => void }) => React.ReactNode;
}) {
  const session = authClient.useSession();
  const [open, setOpen] = useState(false);
  const refreshProfile = api.user.refreshProfile.useMutation({
    onSuccess: () => {
      session.refetch();
      setOpen(false);
      toast.success("Profile updated");
    },
    onError: () => {
      toast.error("Error updating profile");
    },
  });
  return (
    <>
      {children?.({
        open: () => {
          setOpen(true);
        },
      })}
      <Modal.Content role="alertdialog" isOpen={open} onOpenChange={setOpen}>
        <Form
          onSubmit={async (e) => {
            e.preventDefault();
            refreshProfile.mutate();
          }}
        >
          <Modal.Header>
            <Modal.Title>Update Profile from Discord</Modal.Title>
            <Modal.Description>
              This will fetch your latest profile information from Discord to
              keep it in sync.
            </Modal.Description>
          </Modal.Header>
          <Modal.Footer>
            <Modal.Close>Cancel</Modal.Close>
            <Button
              intent="primary"
              type="submit"
              isPending={refreshProfile.isPending}
            >
              Continue
            </Button>
          </Modal.Footer>
        </Form>
      </Modal.Content>
    </>
  );
}
