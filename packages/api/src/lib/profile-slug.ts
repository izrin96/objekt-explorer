import slugify from "slugify";

/**
 * A list's profile slug from its name, before any "-<counter>" a taken slug gets: profile_slug is
 * varchar(100), so the base stops at 90. Empty when the name has no letters slugify keeps.
 */
export const profileSlugBase = (name: string) =>
  slugify(name, { lower: true, strict: true }).slice(0, 90).replace(/-+$/, "");
