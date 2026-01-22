import { validArtists } from "@repo/cosmo/types/common";
import { cookies } from "next/headers";
import * as z from "zod/v4";

import { pub } from "../orpc";

export const configRouter = {
  setArtists: pub.input(z.enum(validArtists).array()).handler(async ({ input: artists }) => {
    const cookie = await cookies();
    cookie.set("artists", JSON.stringify(artists), {
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
      httpOnly: true,
      secure: true,
    });
  }),
};
