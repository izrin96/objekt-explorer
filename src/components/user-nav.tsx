"use client";

import { authClient } from "@/lib/auth-client";
import React, { useState } from "react";
import {
  Avatar,
  buttonStyles,
  Menu,
  Link,
  Modal,
  Form,
  Button,
  Loader,
} from "./ui";
import { usePathname, useRouter } from "next/navigation";
import { User } from "@/lib/server/db/schema";
import { api } from "@/lib/trpc/client";
import { toast } from "sonner";
import {
  DiscordLogoIcon,
  SignOutIcon,
  UserIcon,
  ListHeartIcon,
  GearSixIcon,
  PlusIcon,
  DeviceMobileIcon,
} from "@phosphor-icons/react/dist/ssr";
import { GenerateDiscordFormat } from "./list/modal/generate-discord";
import { CreateList } from "./list/modal/manage-list";
import UserAccount from "./user-account";

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
            Sign in
          </Link>
        </>
      )}
    </div>
  );
}

function UserMenu({ user }: { user: User }) {
  const router = useRouter();
  return (
    <UserAccount>
      {({ open: openAccount }) => (
        <PullDiscordProfile>
          {({ open: openRefreshProfile }) => (
            <GenerateDiscordFormat>
              {({ open: openDiscordFormat }) => (
                <CreateList>
                  {({ open: openCreateList }) => (
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
                      <Menu.Content
                        respectScreen={false}
                        placement="bottom right"
                        className="sm:min-w-56"
                      >
                        <Menu.Section>
                          <Menu.Header separator>
                            <div className="flex flex-col">
                              <span>{user.name}</span>
                              {user.discord && (
                                <span className="font-normal text-muted-fg inline-flex gap-1">
                                  {user.discord}
                                  <DiscordLogoIcon
                                    size={16}
                                    weight="regular"
                                    className="self-center"
                                  />
                                </span>
                              )}
                            </div>
                          </Menu.Header>
                        </Menu.Section>

                        <MyListMenuItem openCreateList={openCreateList} />

                        <Menu.Item onAction={openDiscordFormat}>
                          <DiscordLogoIcon data-slot="icon" />
                          <Menu.Label>Discord List Format</Menu.Label>
                        </Menu.Item>

                        <MyCosmoProfileMenuItem />

                        <Menu.Item onAction={openAccount}>
                          <UserIcon data-slot="icon" />
                          <Menu.Label>Account</Menu.Label>
                        </Menu.Item>

                        <Menu.Item onAction={openRefreshProfile}>
                          <DiscordLogoIcon data-slot="icon" size={16} />
                          <Menu.Label>Refresh Profile</Menu.Label>
                        </Menu.Item>

                        <Menu.Separator />

                        <Menu.Item
                          onAction={() => {
                            authClient.signOut({
                              fetchOptions: {
                                onSuccess: () => {
                                  toast.success("Sign out successful");
                                  router.refresh();
                                },
                              },
                            });
                          }}
                        >
                          <SignOutIcon data-slot="icon" />
                          <Menu.Label>Sign out</Menu.Label>
                        </Menu.Item>
                      </Menu.Content>
                    </Menu>
                  )}
                </CreateList>
              )}
            </GenerateDiscordFormat>
          )}
        </PullDiscordProfile>
      )}
    </UserAccount>
  );
}

function MyListMenuItem({ openCreateList }: { openCreateList: () => void }) {
  const { data, isLoading } = api.list.myList.useQuery();
  const items = data ?? [];
  return (
    <Menu.Submenu>
      <Menu.Item>
        <ListHeartIcon data-slot="icon" />
        <Menu.Label>My List</Menu.Label>
      </Menu.Item>
      <Menu.Content placement="left top">
        {isLoading && (
          <Menu.Item isDisabled>
            <Menu.Label>
              <Loader variant="ring" />
            </Menu.Label>
          </Menu.Item>
        )}
        {!isLoading && items.length === 0 && (
          <Menu.Item isDisabled>
            <Menu.Label>
              <span>No list found</span>
            </Menu.Label>
          </Menu.Item>
        )}
        {items.map((a) => (
          <Menu.Item key={a.slug} href={`/list/${a.slug}`}>
            <Menu.Label>{a.name}</Menu.Label>
          </Menu.Item>
        ))}
        <Menu.Item onAction={openCreateList}>
          <PlusIcon data-slot="icon" />
          <Menu.Label>Create list</Menu.Label>
        </Menu.Item>
        <Menu.Item href={`/list`}>
          <GearSixIcon data-slot="icon" />
          <Menu.Label>Manage list</Menu.Label>
        </Menu.Item>
      </Menu.Content>
    </Menu.Submenu>
  );
}

function MyCosmoProfileMenuItem() {
  const { data, isLoading } = api.profile.getAll.useQuery();
  const items = data ?? [];
  return (
    <Menu.Submenu>
      <Menu.Item>
        <DeviceMobileIcon data-slot="icon" />
        <Menu.Label>My Cosmo Link</Menu.Label>
      </Menu.Item>
      <Menu.Content placement="left top">
        {isLoading && (
          <Menu.Item isDisabled>
            <Menu.Label>
              <Loader variant="ring" />
            </Menu.Label>
          </Menu.Item>
        )}
        {!isLoading && items.length === 0 && (
          <Menu.Item isDisabled>
            <Menu.Label>
              <span>No Cosmo found</span>
            </Menu.Label>
          </Menu.Item>
        )}
        {items.map((a) => (
          <Menu.Item key={a.address} href={`/@${a.nickname}`}>
            <Menu.Label>{a.nickname}</Menu.Label>
          </Menu.Item>
        ))}
        <Menu.Item href={`/link`}>
          <GearSixIcon data-slot="icon" />
          <Menu.Label>Manage Cosmo link</Menu.Label>
        </Menu.Item>
      </Menu.Content>
    </Menu.Submenu>
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
    onError: ({ message }) => {
      toast.error(`Error updating profile. ${message}`);
    },
  });
  return (
    <>
      {children({
        open: () => {
          setOpen(true);
        },
      })}
      <Modal.Content isOpen={open} onOpenChange={setOpen}>
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
              keep it in sync. Only works if your account linked with Discord.
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
