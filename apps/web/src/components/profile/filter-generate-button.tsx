"use client";

import { useProfileObjekts } from "@/hooks/use-profile-objekt";

import { GenerateDiscordButton } from "../generate-discord-button";

export function GenerateDiscordButtonWithData() {
  const { filtered } = useProfileObjekts();
  return <GenerateDiscordButton objekts={filtered} />;
}
