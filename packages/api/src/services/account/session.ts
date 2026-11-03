import { getRequestHeaders, setResponseHeader } from "@tanstack/react-start/server";

import { auth } from "./auth";

// apart from `auth` so the socket server, compiled outside Vite, never reaches TanStack Start
export async function getSession() {
  const session = await auth.api.getSession({
    headers: getRequestHeaders(),
    returnHeaders: true,
  });

  if (!session.response) {
    return null;
  }

  const cookies = session.headers.getSetCookie();
  if (cookies.length) {
    setResponseHeader("Set-Cookie", cookies);
  }

  return session.response;
}
