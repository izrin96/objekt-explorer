## MODIFIED Requirements

### Requirement: Post composer
New post SHALL open the post composer, a page of its own (see Composer page), where the viewer picks what the post is for: Swap (WTT), Sell (WTS) or Buy (WTB), as one choice. Then they pick its lists:
- Swap: a have list, a want list, or both, and "I'd also pay for what I'm looking for", available only with a want list;
- Sell: one sale list, and "Also open to swaps"; with it ticked, optionally one want list for what the viewer would swap for, and "I'd also pay for what I'm looking for", available only with a want list;
- Buy: one want list.

Post SHALL stay disabled until the kind's lists are picked. Before posting, the composer SHALL show the tags the post will carry and who it matches.

#### Scenario: Swap with both lists
- **WHEN** the viewer picks Swap, have list "spares" and want list "binary hunt", leaves "also pay" off and posts
- **THEN** one WTT post holds both lists, "spares" is linked to "binary hunt", "binary hunt" is open to swaps only, and both are on Trade

#### Scenario: Swap that would also pay
- **WHEN** the viewer picks Swap, want list "binary hunt" and ticks "also pay"
- **THEN** the composer shows WTT and WTB, says sellers with what they look for match them too, and posting saves "binary hunt" open to swaps or buying

#### Scenario: Also pay needs a want list
- **WHEN** the viewer picks Swap and only have list "spares"
- **THEN** "also pay" is disabled and says to pick a want list first

#### Scenario: Buy post
- **WHEN** the viewer picks Buy and want list "store hunt" and posts
- **THEN** "store hunt" is on Trade set to Buying only, and its post is tagged WTB

#### Scenario: Sell post
- **WHEN** the viewer picks Sell and sale list "binary sale" and posts
- **THEN** "binary sale" is on Trade and on Market, tagged WTS

#### Scenario: Nothing picked
- **WHEN** the viewer picks Swap and no list
- **THEN** Post is disabled

#### Scenario: Signed out
- **WHEN** a signed-out visitor activates New post
- **THEN** the browser is at `/login?redirect=/trade`

#### Scenario: Sell, open to swaps
- **WHEN** the viewer picks Sell, sale list "binary sale", ticks "Also open to swaps" and posts
- **THEN** the composer showed WTS and WTT before posting, and "binary sale" is on Trade and on Market, open to swaps

#### Scenario: Sell with a want list
- **WHEN** the viewer also picks want list "binary hunt" and posts
- **THEN** one post holds both lists, "binary sale" is linked to "binary hunt", and "binary hunt" is open to swaps only

#### Scenario: A want list needs swaps
- **WHEN** the viewer picks Sell with "Also open to swaps" off
- **THEN** no want list can be picked, and the composer says to tick "Also open to swaps" first

#### Scenario: Back to Sell only
- **WHEN** the viewer edits that post and unticks "Also open to swaps"
- **THEN** the composer asks to unpair "binary hunt" first, and after posting "binary sale" is Sell only and unlinked

#### Scenario: Sell with a want list that would also pay
- **WHEN** the viewer picks Sell, sale list "binary sale", ticks "Also open to swaps", picks want list "binary hunt" and ticks "also pay"
- **THEN** the composer shows WTS, WTT and WTB, and posting saves "binary hunt" open to swaps or buying, linked to "binary sale"

#### Scenario: Also pay on Sell needs a want list
- **WHEN** the viewer picks Sell, ticks "Also open to swaps" and picks no want list
- **THEN** "also pay" is disabled and says to pick a want list first

#### Scenario: Removing the want list clears also pay
- **WHEN** the viewer had ticked "also pay" on Sell, then unticks "Also open to swaps" or removes the want list
- **THEN** "also pay" is off, and the composer shows the tags without WTB

#### Scenario: Kind and lists on one page
- **WHEN** the viewer activates New post
- **THEN** the composer page shows the Swap, Sell and Buy choice and, once one is picked, its lists, with no second step

## ADDED Requirements

### Requirement: Composer page
The composer SHALL be the page `/trade/new`. Edit post SHALL open it with `edit` naming the post, titled Edit post and starting on the post's kind and lists. Every control that opened the composer SHALL open this page with the same picks. Posting SHALL return the viewer to the page they came from, or Browse. A signed-out visitor SHALL be sent to sign in and come back.

#### Scenario: From the list page
- **WHEN** the viewer activates Post it on want list "binary hunt", paired with have list "spares"
- **THEN** `/trade/new` opens on Swap with both lists picked, and after Post the viewer is back on "binary hunt"

#### Scenario: Edit post
- **WHEN** the viewer activates Edit post on their Buy post holding "store hunt"
- **THEN** the page reads Edit post, starts on Buy with "store hunt" picked, and saving updates that post

#### Scenario: Signed out
- **WHEN** a signed-out visitor opens `/trade/new`
- **THEN** the browser is at `/login?redirect=/trade/new`

### Requirement: Composer page layout
On a wide screen the composer page SHALL hold a narrow settings column with the post's preview beside it. Below that width, the preview SHALL follow the settings and Post SHALL stay in reach at the bottom.

#### Scenario: Phone
- **WHEN** the viewer opens the page at 390 px
- **THEN** the preview sits below the settings, and Post is reachable without scrolling back up

### Requirement: Lists as dropdowns
Each list of a post SHALL be picked from one dropdown per side. A list the composer can't take SHALL stay in the dropdown, disabled, with its reason (see Composer list rules), and an optional side SHALL offer No list.

#### Scenario: Disabled with a reason
- **WHEN** want list "store hunt" is in the viewer's Buy post and they start a Swap post
- **THEN** the Looking for dropdown lists "store hunt" disabled with "In your Buy post"

### Requirement: Post preview
The composer SHALL show the post as Trade will show it: its tags, Has (Selling for a sale list) and Wants, each with its list's name and up to 23 objekt thumbnails followed by "+N", the want list's rules, and who it matches. "+N" SHALL open every objekt of that side in a side sheet. The preview SHALL follow every pick as it changes.

#### Scenario: Preview follows picks
- **WHEN** the viewer picks Swap, have list "spares" holding 30 objekts and want list "binary hunt" holding the rule CC366
- **THEN** the preview shows WTT, "spares" with 23 thumbnails and "+7", and "binary hunt" with the CC366 rule

#### Scenario: All objekts
- **WHEN** the viewer activates "+7"
- **THEN** a side sheet shows all 30 objekts of "spares"

### Requirement: Rules in the composer
While a want list is picked, its side of the preview SHALL list its rules and offer Add rule, which SHALL open the list page's rule form in a side sheet. Adding a rule SHALL save it to the list at once, close the sheet and keep the composer's picks; leaving the composer SHALL keep the rule.

#### Scenario: Add a rule while posting
- **WHEN** the viewer picks Swap and want list "binary hunt", activates Add rule and adds the rule CC366, any member
- **THEN** the sheet closes, the picks are as before, and the Wants side lists the CC366 rule

#### Scenario: Leave without posting
- **WHEN** the viewer adds a rule to "binary hunt" on the page, then leaves without posting
- **THEN** "binary hunt" holds the rule, and its Trade state is as before

#### Scenario: Rule limit
- **WHEN** "binary hunt" already holds 20 rules and the viewer adds another
- **THEN** it is refused with the same message as on the list page, and the composer keeps its picks

### Requirement: New want list in the composer
Beside the want dropdown, New want list SHALL take a name and create an empty want list, filed under no Cosmo profile and off Trade, and pick it. Create SHALL be disabled while the name is empty. Leaving the composer SHALL keep the list, off Trade. A refused create SHALL say why and keep the name and the previous pick.

#### Scenario: First want list
- **WHEN** the viewer has only have list "spares", picks Swap, creates want list "cc366 hunt" and adds the rule CC366
- **THEN** "cc366 hunt" is picked, and posting makes one WTT post of "spares" and "cc366 hunt", linked, with "cc366 hunt" open to swaps only

#### Scenario: Buy post with a new want list
- **WHEN** the viewer picks Buy, creates want list "store hunt" and posts
- **THEN** "store hunt" is on Trade set to Buying only

#### Scenario: Leave keeps the list
- **WHEN** the viewer creates "cc366 hunt" and leaves without posting
- **THEN** "cc366 hunt" stays among the viewer's lists, off Trade

### Requirement: Ratios in the preview
On a side that swaps (a have list, or a want list unless the post is Buy), the preview SHALL offer "Ratio for all" by the list's name and let the viewer tap a thumbnail or a rule to give it its own ratio, with the choice 1:1 or 2 to 5 (see `web-lists` Trade ratio). Each choice SHALL save at once. A thumbnail or rule following the list's ratio SHALL show it apart from one set on its own. A sale list and a Buy post's want list SHALL offer no ratio.

#### Scenario: Ratio for all, one override
- **WHEN** the viewer sets "Ratio for all" on "spares" to 1:2, then taps Lynn SCO and picks 1:3
- **THEN** every thumbnail of "spares" shows 1:2 as following the list, Lynn SCO shows its own 1:3, and both are saved

#### Scenario: Buy post
- **WHEN** the viewer picks Buy and want list "store hunt"
- **THEN** the preview offers no ratio
