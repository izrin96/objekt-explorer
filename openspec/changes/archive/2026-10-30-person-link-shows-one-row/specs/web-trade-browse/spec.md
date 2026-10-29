## MODIFIED Requirements

### Requirement: Matches to the signed-in viewer
For a signed-in viewer, each person's row on Browse and on For you SHALL show that person's counts. They are taken across all of the person's listed have, sale and want lists (on Trade, not idle), with the rules and ownership check of `web-trade-for-you`. They are counted against the viewer's lists, or, on For you, against the lists Compare with names:
- "They have N you want": collections on the person's have or sale lists that are on one of the viewer's want lists that can take them. A have list, and a sale list open to swaps, count against a want list open to swaps (Swaps only, or Swaps or buying); every sale list counts against a want list open to buying (Swaps or buying, or Buying only).
- "You have N they want": collections on the person's want lists that are on one of the viewer's have or sale lists that is bound to a Cosmo profile and still tradeable by the viewer. A have list, and a sale list open to swaps, count for a want list open to swaps; every sale list counts for a want list open to buying.
- The mutual score: what the person and the viewer can swap within one post on each side. A post here is a linked pair: a have list, or a sale list open to swaps, and the want list linked to it, posted or not on the viewer's side. For each pairing of one of the viewer's posts with one of the person's posts there are two swap counts: the collections on the person's post's have list, or sale list open to swaps, that are on the viewer's post's want list when it is open to swaps (Swaps only, or Swaps or buying); and the collections on the person's post's want list, when it is open to swaps, that are on the viewer's post's have list, or sale list open to swaps, bound to a Cosmo profile and still tradeable by the viewer. A pairing scores the smaller of the two, and the person's mutual score is the highest score of any pairing. A list with no link, the person's or the viewer's, SHALL never count toward the mutual score, though it counts toward the two counts above. A sale list set to Sell only, the person's or the viewer's, SHALL never count toward the mutual score either: a sale is not a swap, so a person matched only through such lists is one way. A want list set to buying only never counts toward it.

The counts show once, in the row's header sentence (see Trade card). Each list in the row SHALL also show its own count, by the same rules, taken on that list alone: on a have or sale list the collections the viewer wants ("14 you want"), on a want list the collections the viewer has ("2 you have"). Matched objekts SHALL be marked with a ring, judged on the list's own objekts. There SHALL be no match chip, no popover of matched lists and no All matches control.

A person with both counts above zero and a mutual score of zero SHALL read as one way, with no Can swap mark, when that is only because the swaps cross posts or run through lists with no link; "No swap · buy or sell" SHALL stay for a person whose both-way matches run only through sale lists set to Sell only or want lists set to buying only.

Matching SHALL use the viewer's have lists bound to a Cosmo profile, not everything their wallet holds, so an objekt the viewer keeps off their have lists never counts as offered.

**Matches prompt.** Browse has no Matches control. Beside its Post type menu:
- a signed-out visitor SHALL see one line inviting them to sign in to see which posts match their lists, with a Sign in link to `/login?redirect=/trade/for-you`;
- a signed-in viewer SHALL see no line there, whether or not they have a list that can match.

Browse SHALL list the viewer's own row, so they can see where a bump put them, with no header sentence and no list counts or rings. For you SHALL never list it. People the viewer hid SHALL be left out of both (see `web-trade-for-you` Hide a partner).

**Person link.** `person=<user id>` on `/trade` or `/trade/for-you` SHALL list only that person's row, with every one of their kept posts shown, and no other people and no further pages. The row SHALL ignore the visitor's artist selection, as a `slug` link does, and SHALL follow the link's other filters, an `artist` parameter included; the filters stay on the page. Above the row a banner SHALL say that only that person's posts are shown, from a shared link, adding how many of their objekts are on the viewer's lists when the viewer is signed in and that number is above zero. The banner SHALL carry Copy link, which copies the Browse address for that person with the link's filters, leaving out For you's matching choice, and Show everyone. Under the row a line SHALL say more people are on Trade and lead to the full feed. The row SHALL carry no clear control of its own. When the feed would not list that person (hidden, blocking or blocked, trade-blocked, nothing listed or all idle, all sold out, no match on For you, or only one way under Mutual only), the page SHALL show an empty state saying the link's person has nothing to show here, with Show everyone, and SHALL not name the person. Show everyone and the line under the row SHALL remove the parameter and the link's filters, keeping For you's matching choice, and list the feed as usual; going back SHALL return to where the visitor came from. For a signed-out visitor, `person` SHALL show that person's row and the banner without counts.

#### Scenario: Default
- **WHEN** a signed-in viewer with a want list opens `/trade` with no parameters
- **THEN** every person with a listed post is listed, with header sentences, list counts and rings, and no Matches or Compare with control shows

#### Scenario: Own post on Browse
- **WHEN** the viewer bumps and opens `/trade`
- **THEN** their row is listed at the top of Browse with no header sentence, and it is not listed on `/trade/for-you`

#### Scenario: Held but not on a have list
- **WHEN** the viewer holds SeoYeon 204Z but it is on none of their have lists, and a person's want list wants it
- **THEN** SeoYeon 204Z is not ringed or counted on that list or in that person's sentence

#### Scenario: Counts sit on their list
- **WHEN** nuppotoz has want lists "S24 WISHLIST", holding nothing the viewer has, and "WISHLIST", holding 3 collections on the viewer's bound have lists
- **THEN** nuppotoz's row reads "You have 3 they want", the WISHLIST strip reads "3 you have" with those 3 ringed and listed first, and the S24 WISHLIST strip shows no count

#### Scenario: Which lists matched
- **WHEN** a person's want list asks for two collections that are on the viewer's have list "spares"
- **THEN** that want list's strip reads "2 you have" with both ringed, and no popover or control names the viewer's lists

#### Scenario: Unlinked lists, one person
- **WHEN** rin.trades has a have list holding 1 collection the viewer wants and a separate want list, not linked to it, asking for 2 collections on the viewer's bound have lists, none of these on sale lists
- **THEN** rin.trades's row reads "They have 1 you want" and "You have 2 they want" with no Can swap mark, the have list reads "1 you want", the want list "2 you have", and rin.trades is listed under One way

#### Scenario: Swaps across the viewer's posts
- **WHEN** the viewer's post P1 pairs have list "jiwoo spares" with want list "doubles hunt", their post P2 pairs have list "yooyeon spares" with want list "hyerin and kaede", and mina.k's post holds 2 collections on "doubles hunt" and wants 1 collection on "yooyeon spares"
- **THEN** mina.k's row reads "They have 2 you want" and "You have 1 they want" with no Can swap mark, and mina.k is listed under One way, not Can swap

#### Scenario: A rule inside one post
- **WHEN** the viewer's post P1 pairs "jiwoo spares" with "doubles hunt", whose rule wants every Double, and rae.s's post holds a Double and wants a collection on "jiwoo spares"
- **THEN** rae.s's row reads "You can swap 1", and rae.s is listed under Can swap

#### Scenario: The viewer's unlinked want list
- **WHEN** the viewer's want list "wishlist" has no link, sora.p's post holds 1 collection on "wishlist" and wants 1 collection on the viewer's have list "jiwoo spares", whose post pairs it with "doubles hunt", which wants nothing sora.p has
- **THEN** sora.p's row reads "They have 1 you want" and "You have 1 they want" with no Can swap mark, and sora.p is listed under One way

#### Scenario: The person's posts are counted one at a time
- **WHEN** the viewer's single post pairs "spares" with "binary hunt", and rin.trades has two posts: the first holds 2 collections on "binary hunt" and wants nothing of the viewer's, the second holds nothing the viewer wants and wants 1 collection on "spares"
- **THEN** rin.trades has no Can swap mark and is listed under One way

#### Scenario: A sale list never makes a person mutual
- **WHEN** jinsoul.blue's sale list, set to Sell only, holds 3 collections on the viewer's want lists (open to swaps or buying), jinsoul.blue has no have list, and their want list asks for 1 collection on the viewer's bound have list
- **THEN** jinsoul.blue's row reads "You have 1 they want", the sale list reads "3 you want", and jinsoul.blue is listed under One way, not Mutual

#### Scenario: Sale listings aren't mutual
- **WHEN** jinsoul.blue's sale list, set to Sell only, holds 3 collections on the viewer's want list, which is open to swaps only, and their want list asks for 1 collection on the viewer's bound have list
- **THEN** the sale list does not count, so jinsoul.blue's row reads "You have 1 they want", the sale list shows no count, and jinsoul.blue is not listed under Mutual

#### Scenario: The viewer's sale list against their want list
- **WHEN** the viewer's sale list, set to Sell only, holds a collection that rin.trades's want list asks for, and rin.trades has a have list holding a collection the viewer wants
- **THEN** rin.trades is not Mutual through it, whatever that want list is open to; when it is open to buying, the collection counts in rin.trades's "You have N they want"

#### Scenario: A buying-only want list ignores have lists
- **WHEN** rin.trades's have list holds 2 collections on the viewer's want list, which is set to Buying only, and rin.trades has no sale list
- **THEN** rin.trades's row does not count them, rings none of those objekts, and rin.trades is not listed under Mutual

#### Scenario: Chips follow Compare with
- **WHEN** on For you, Compare with names have list "spares" linked to want list "binary hunt", and rin.trades has 2 collections on "binary hunt" and 1 on another of the viewer's want lists, and wants nothing of the viewer's
- **THEN** rin.trades's row reads "They have 2 you want", not 3

#### Scenario: Mutual partner
- **WHEN** the viewer opens `/trade?person=<rin.trades's id>` and rin.trades has 4 listed posts
- **THEN** rin.trades's row is the only row, with all 4 posts shown, no further page loads, and Show everyone in the banner removes `person` from the URL and lists the feed as usual

#### Scenario: Banner on a shared link
- **WHEN** a signed-in viewer opens `/trade?person=<nuppotoz's id>` and 3 objekts on nuppotoz's posts are on the viewer's lists
- **THEN** the filters show, a banner above the row reads that only nuppotoz's posts are shown, from a shared link, and that 3 objekts are on the viewer's lists, with Copy link and Show everyone; the row has no clear control; a line under it says more people are on Trade

#### Scenario: Signed-out banner
- **WHEN** a visitor without a session opens `/trade?person=<id>` for someone with listed posts
- **THEN** the banner names that person with no count, and Copy link copies `/trade?person=<id>`

#### Scenario: Person link to someone hidden
- **WHEN** the viewer opens `/trade?person=<id>` for a person they hid
- **THEN** no row is listed, and the empty state says the link's person has nothing to show here, without their name, and offers Show everyone

#### Scenario: Person outside the artist selection
- **WHEN** a visitor with only ARTMS selected opens `/trade?person=<id>` for someone whose posts hold only tripleS objekts
- **THEN** that person's row is listed, and Show everyone brings back the ARTMS-only feed

#### Scenario: Person with nothing listed
- **WHEN** a visitor opens `/trade?person=<id>` for someone whose posts are all idle
- **THEN** no row is listed, the empty state offers Show everyone, and activating it lists the feed as usual

#### Scenario: Old link
- **WHEN** the viewer opens `/trade?match=mutual` from an older link
- **THEN** the browser is at `/trade/for-you?match=mutual` and Can swap is on

#### Scenario: Signed out
- **WHEN** a visitor without a session opens `/trade`
- **THEN** rows are listed with no header sentence, no list counts and no rings, and a line beside the Post type menu invites them to sign in to see matches, linking to `/login?redirect=/trade/for-you`

#### Scenario: No list that can match
- **WHEN** a signed-in viewer whose only list is a have list not bound to a Cosmo profile opens `/trade`
- **THEN** no line shows beside the Post type menu, and the For you tab is hidden

#### Scenario: Hidden partner
- **WHEN** the viewer hid rin.trades
- **THEN** rin.trades's row is not listed on Browse or For you for that viewer

#### Scenario: A have list and a want list both ways make a swap
- **WHEN** rin.trades's have list holds 2 collections on the viewer's want list open to swaps or buying, rin.trades's want list (open to swaps), linked to that have list, asks for 3 collections on the viewer's bound have list, which is linked to that want list, and rin.trades's sale list, set to Sell only, holds 4 more collections the viewer wants
- **THEN** rin.trades's row reads "You can swap 2", and rin.trades is listed under Mutual

#### Scenario: A sale list open to swaps makes a swap
- **WHEN** jinsoul.blue's sale list, open to swaps, holds 3 collections on the viewer's want list open to swaps only, and jinsoul.blue's want list (open to swaps), linked to that sale list, asks for 2 collections on the viewer's bound have list, which is linked to that want list
- **THEN** jinsoul.blue's row reads "You can swap 2", the sale list reads "3 you want", and jinsoul.blue is listed under Mutual

### Requirement: Your posts and Post a list
A signed-in viewer's posts SHALL be summarised above the feed in one row: the title Your posts, how many of them are listed, how many are idle, when the next bump is allowed while it is not, the one Bump control (see Bump), disabled until then, a Copy link control, a New post control that opens the post composer, and a control that shows or hides the posts. The row SHALL show on Browse; For you and a signed-out visitor SHALL keep a New post control above the feed in its place. Shown, each entry SHALL be one post and show:
- its tags and kind (Swap, Sell or Buy);
- each list with its role: Offering for a have list, Looking for for a want list, Selling for a sale list, each linking to its list page;
- the option it carries: "Would also pay" on a Swap post that would, "Also on Market" on a Sell post;
- whether the post is listed or idle, and when it was last changed;
- a menu with Edit post, Copy link and Take off Trade.

A post has no address of its own, so Copy link SHALL copy the Person link (see Matches to the signed-in viewer) to the viewer's row: `/trade?person=<their id>`. The row's Copy link SHALL copy it as is. It SHALL be disabled while none of the posts is listed or the viewer is under a trade block, and SHALL show which reason applies. A post's Copy link SHALL add `type` set to the tag of the post's kind (`wtt` for Swap, `wts` for Sell, `wtb` for Buy) when the post carries that tag, and leave it out when it does not. Both SHALL confirm with "Link copied" and the copied address. A post's Copy link SHALL be disabled while the viewer is under a trade block, and on an idle post, each with its reason as a second line: a trade block hides their posts from Trade, and idle posts don't show in Browse until bumped. The feed would leave the row out in both cases.

With no choice saved in this browser, the posts SHALL start shown when any of them is idle, and hidden otherwise. Showing or hiding them SHALL be remembered in this browser, and that choice SHALL win over the default. A viewer with no posts SHALL see the row say they have no posts on Trade, with New post. A signed-out visitor activating New post SHALL be sent to `/login?redirect=/trade`.

#### Scenario: New post on For you
- **WHEN** a signed-in viewer opens `/trade/for-you`
- **THEN** no Your posts row shows, and a New post control above the feed opens the composer

#### Scenario: Summary of six posts
- **WHEN** the viewer has six posts, one idle, and last bumped 2 days ago
- **THEN** the row reads Your posts with 5 listed and 1 idle, and its Bump control is enabled

#### Scenario: Bumped within the day
- **WHEN** the viewer has three posts and bumped an hour ago
- **THEN** the row reads Your posts with 3 listed and the next bump in 23 hours, and its Bump control is disabled

#### Scenario: Starts hidden when nothing is idle
- **WHEN** none of the viewer's posts is idle and they have never shown or hidden them
- **THEN** only the summary row is above the feed

#### Scenario: Starts shown when a post is idle
- **WHEN** one of the viewer's posts is idle and they have never shown or hidden them
- **THEN** the posts are listed under the summary row

#### Scenario: The choice is remembered
- **WHEN** the viewer hides the posts and later opens `/trade` again in the same browser, with a post now idle
- **THEN** the posts stay hidden, and the summary row still counts the idle post

#### Scenario: Post from the dialog
- **WHEN** the viewer activates New post and posts want list "binary hunt" as a Buy post
- **THEN** the list is on Trade and in matching, and appears under Your posts as bumped just now

#### Scenario: Unbound have list
- **WHEN** the viewer's have list is not filed under a Cosmo profile
- **THEN** it shows disabled in the composer New post opens, with the reason shown

#### Scenario: A Swap post entry
- **WHEN** the viewer's Swap post holds "spares" and "binary hunt" and would also pay
- **THEN** its entry shows WTT and WTB, Swap, Offering spares, Looking for binary hunt, and "Would also pay"

#### Scenario: Take down from the dialog
- **WHEN** the viewer chooses Take off Trade on a Sell post
- **THEN** the sale list leaves `/trade`, Market and For you

#### Scenario: Copy the link to all posts
- **WHEN** the viewer activates Copy link on the Your posts row with 3 listed posts
- **THEN** `/trade?person=<their id>` is copied, and opening it lists only their row

#### Scenario: Copy a post's link
- **WHEN** the viewer chooses Copy link on a listed Sell post
- **THEN** `/trade?person=<their id>&type=wts` is copied, and opening it lists only their row, with their Sell posts

#### Scenario: Copy link under a trade block
- **WHEN** a viewer under a trade block opens Your posts
- **THEN** the row's Copy link and each post's Copy link are disabled, and each says a trade block hides their posts from Trade

#### Scenario: Copy link on an idle post
- **WHEN** the viewer opens the menu of an idle post
- **THEN** Copy link is disabled and says to bump the post first

#### Scenario: No posts
- **WHEN** a signed-in viewer has no posts
- **THEN** the row says they have no posts on Trade and offers New post
