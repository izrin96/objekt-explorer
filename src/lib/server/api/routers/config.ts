import { cookies } from "next/headers";
import { z } from "zod/v4";
import { validArtists } from "@/lib/universal/cosmo/common";
import { pub } from "../orpc";

export const configRouter = {
  setArtists: pub.input(z.enum(validArtists).array()).handler(async ({ input: artists }) => {
    const cookie = await cookies();
    await cookie.set("artists", JSON.stringify(artists), {
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
      httpOnly: true,
      secure: true,
    });
  }),
};
