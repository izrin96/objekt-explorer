/**
 * Release notes are a dated record of what shipped, not product chrome, so they
 * stay in the language they were written in — the old website carried the same
 * array verbatim. Everything around them goes through `m.*`.
 */
export const CHANGELOG = [
  {
    date: "2026-11-12 - 2026-11-13",
    items: [
      "Make offer pickers show one tile per collection. With several copies, pick a serial, or Any serial on You get.",
      "Each side of an offer can now hold up to 200 objekts.",
      "New want list setting: Remove objekts I get in a trade. It is on for new want lists.",
      "A post you hid on Trade comes back when its owner adds something that matches your lists.",
      "Compare on the Marketplace and on list pages can now use one of your own lists.",
    ],
  },
  {
    date: "2026-11-05 - 2026-11-11",
    items: [
      "New offer settings in Account › General: Only offers with what I want, Let people ask from more than one post, and Let people ask for anything I hold.",
      "If you have no have or sale list on Trade, people can no longer ask for objekts in your collection unless you turn on Let people ask for anything I hold.",
      "Hide a single post on Trade without hiding its owner.",
      "The post composer can edit or copy a list, select several objekts, and Add to list.",
      "Activity shows what each spin returned.",
      "Better serial estimates for offline objekts.",
      "Resend the verification email from Account › Email.",
      "The old /api read routes are gone. Use /api/v1.",
    ],
  },
  {
    date: "2026-10-26 - 2026-11-04",
    items: [
      "Trade people and posts have their own shareable pages.",
      "Have and want lists can show a trade ratio (display only).",
      "Added Show my matches on the Marketplace, list pages and profiles.",
      "Reworked Add to list. Want-list rules have no size limit.",
      "Messages: reply with a quote, see each conversation's deal, and click links.",
      "Profiles can have a bio, and you can see who is online.",
      "Snapshot picker date presets.",
    ],
  },
  {
    date: "2026-10-25",
    items: [
      "Added a Trade page: Browse lists trade and sale posts, and For you (formerly Trade Matches) finds people to trade with across all your lists.",
      "Post your lists on Trade to swap, sell or buy.",
      "Want lists can be posted as Swap, as Buy, or as Swap that would also pay.",
      'Want lists can hold rules, like "any member of CC366" or "Cream02 FCO 3rd".',
      "Sale lists can be posted as Sell, or as Sell that is also open to swaps.",
      "Added Messages and offers. Accepted trades are verified on-chain.",
      "Added notifications for offers, trades and want list matches.",
      "Added an Account page for all your settings.",
      "Desktop shows every filter on the toolbar.",
      "Added Default profile: choose which profile names you to others.",
      "Removed Hide User.",
      "Removed profile privacy settings.",
    ],
  },
  {
    date: "2026-09-26 - 2026-10-06",
    items: [
      "Added a public API. Find it under API in the About dialog.",
      "Added a Holders tab in the Objekt view, showing who holds the objekt and how many copies.",
      "Improved serial number estimates for offline objekts. Spot a wrong one? Report it in our Discord.",
      "Sale list cards now show the price in your preferred currency.",
      "In select mode, Shift+click selects a range of objekts.",
      "The Marketplace can now show only what your profile doesn't own yet. Pick one of your profiles under Compare.",
      "The Compare dialog on a list now lets you pick one of your profiles, or choose Other profile to enter any Cosmo ID.",
      "Rework Cosmo link flow UI.",
      "Newly minted Welcome objekt now marked as non-transferable.",
      "Exclude MinGyeol from overall progress chart.",
      "Long press a pinned objekt to drag it into a new order. Long press any other objekt to select it.",
      "Some UI improvements (move reset filter button, search user dialog, profile hover card, objekt preview on list card etc).",
      "Improve cosmo-spin profile load.",
    ],
  },
  {
    date: "2026-09-24 - 2026-09-25",
    items: [
      "Redesigned the whole site, new heading fonts and many layout and usability improvements.",
      "The Objekt view now slides in from the right, which works better on mobile.",
      "The profile banner can now be hidden.",
      "Temporarily removed the Objekt Columns setting from profiles and lists. It may not come back.",
      "Added member chips on desktop for picking members quickly.",
      "The select mode toolbar now lists the objekts you selected.",
      "The COSMO Spin profile now shows one card per collection with its number of copies, and every filter, sort and tab works on it. Snapshots are not available for COSMO Spin.",
      "The Serials tab in the Objekt view can now step through only spun or only non-spun serials.",
    ],
  },
  {
    date: "2026-09-16",
    items: [
      "Added Japanese (日本語) language. Switch to it in Settings. Thanks to たろう (@iddnntt) from X.",
    ],
  },
  {
    date: "2026-09-14",
    items: [
      "Added a Marketplace page showing all objekts listed in discoverable Sale lists, with floor price and number of objekts listed.",
      "Filter by priced only or floor price range, and sort by lowest price, recently listed, or most listed.",
      "The Market tab in the Objekt view now shows floor price, objekts listed, and seller count.",
      "Pick a preferred currency in Settings. Marketplace prices are converted into it instead of USD.",
    ],
  },
  {
    date: "2026-08-27",
    items: [
      "Unit objekts are now recognized by each individual member, not just the combined name. Filtering and searching by a member includes the unit objekts that member appears in.",
      "(Note: This affects Progress, as unit objekts now count toward each member's total.)",
    ],
  },
  {
    date: "2026-06-02",
    items: [
      "Trade Matches now works with standalone Have or Want lists. No pairing required. Each list can independently find matches in one direction (Have→Want or Want→Have).",
      "Paired Have+Want lists get a new mode selector in the Trade Matches: Have only, Both, or Want only. Both mode matches your paired Have+Want against other users' paired Have+Want.",
      "Want lists can now be marked as Discoverable (no profile binding needed, except Have list).",
      "(Note: Trade matching require the partner's list to be discoverable.)",
    ],
  },
  {
    date: "2026-05-31",
    items: ["Profile banner now extends slightly outside the container."],
  },
  {
    date: "2026-05-29",
    items: [
      "Refactored list types for better user-friendliness: General, Sale, Have, and Want.",
      'Added a Trade Matches feature: This is enabled after linking a paired Have/Want list. Objekts added to your Have/Want list will only match with users who have enabled the "Discoverable" option. (Note: Discoverable mode requires Cosmo profile binding).',
      "Profile-bound Sale and Have lists can now hide serial numbers.",
      'Added a Market tab to the Objekt view. Objekts must be added to a Sale list with the "Discoverable" option enabled. Prices in the Market are automatically converted to USD for now.',
    ],
  },
  {
    date: "2026-04-20 - 2026-04-23",
    items: [
      "Added move pin order. You can now move your objekt pin.",
      "Added export button to list view to export as csv file. This could be useful in future to import into third party service like Apollo.",
      "Added member emoji option in Generate Discord format.",
    ],
  },
  {
    date: "2026-04-10",
    items: ["Added sorting by Rarity. Mint counts are updated hourly."],
  },
  {
    date: "2026-04-06",
    items: [
      "Added a Compare button to the list view. You can now compare the current list with your profile or another list. Note: This is an early implementation, UX is still being refined.",
    ],
  },
] as const;
