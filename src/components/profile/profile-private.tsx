"use client";

import { useProfile } from "@/hooks/use-profile";
import { useProfileAuthed } from "@/hooks/use-user";
import { LockIcon } from "@phosphor-icons/react/dist/ssr";
import React, { PropsWithChildren } from "react";

export default function ProfilePrivacyWrapper(props: PropsWithChildren) {
  const isProfileAuthed = useProfileAuthed();
  const targetProfile = useProfile((a) => a.profile!);

  if (targetProfile.privateProfile && !isProfileAuthed)
    return (
      <div className="flex flex-col justify-center items-center w-full gap-2 py-12 font-semibold">
        <LockIcon size={64} weight="light" />
        Profile Private
      </div>
    );

  return props.children;
}
