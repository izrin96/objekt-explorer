import type { CosmoPublicUser, CosmoSearchResult } from "@/lib/universal/cosmo/auth";

import { cosmo } from "../http";

export async function search(token: string, nickname: string) {
  return await cosmo<CosmoSearchResult>("/bff/v3/users/search", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    query: {
      nickname,
      skip: 0,
      take: 100,
    },
  });
}

export type RefreshTokenResult = {
  refreshToken: string;
  accessToken: string;
};

export async function refresh(refreshToken: string): Promise<RefreshTokenResult> {
  return await cosmo<{ credentials: RefreshTokenResult }>("/auth/v1/refresh", {
    method: "POST",
    body: { refreshToken },
  }).then((res) => res.credentials);
}

export async function fetchByNickname(nickname: string): Promise<CosmoPublicUser | undefined> {
  return await cosmo<{ profile: CosmoPublicUser }>(`/user/v1/by-nickname/${nickname}`)
    .then((res) => res.profile)
    .catch(() => undefined);
}
