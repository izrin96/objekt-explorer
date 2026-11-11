import { m } from "@/paraglide/messages";

import { type FormatFlag } from "./choices";

export const FLAGS: { key: FormatFlag; label: () => string }[] = [
  { key: "showCount", label: m.generate_discord_show_count },
  { key: "includeLink", label: m.generate_discord_include_link },
  { key: "lowercaseCollection", label: m.generate_discord_lower_case },
  { key: "bullet", label: m.generate_discord_bulleted_list },
  { key: "showMemberEmoji", label: m.generate_discord_show_member_emoji },
  { key: "hideType", label: m.generate_discord_hide_type },
];
