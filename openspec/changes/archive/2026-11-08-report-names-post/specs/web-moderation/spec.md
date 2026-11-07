## MODIFIED Requirements

### Requirement: Report a user
A signed-in user SHALL be able to report another account from a conversation's menu, a person's row on Trade, a Trade post's menu or a profile, choosing:
- a reason: scam or fake offer, harassment, spam, pretending to be someone else, or something else;
- an optional note of up to 500 characters;
- "Share this conversation with moderators", on by default and offered only from a conversation;
- "Also block", off by default.

A report from a Trade post's menu, or from the row on a post page, SHALL name that post (see Reports with a Trade post attached). A report from a row elsewhere on Trade, a conversation or a profile SHALL name no post.

A shared excerpt SHALL be a copy of every message of that conversation at the time of the report, kept with the report; later messages, unsends or deletions SHALL not change it. A message unsent before the report SHALL be in the excerpt with its text and card, marked as unsent. The excerpt SHALL be the only way message text reaches moderators. A user SHALL be able to report the same account at most once per 24 hours, whichever post the report names.

#### Scenario: Report without sharing
- **WHEN** a user reports harassment with sharing turned off
- **THEN** the report reaches moderators with the reason and note, and no message text

#### Scenario: Report and block
- **WHEN** the user reports spam with "Also block" on
- **THEN** the report is filed and the account is blocked

#### Scenario: Long conversation
- **WHEN** a user reports from a conversation holding 450 messages with sharing on
- **THEN** the moderator sees all 450 messages in the excerpt

#### Scenario: Unsent message in the excerpt
- **WHEN** a user reports a conversation in which the other account unsent a payment request
- **THEN** the moderator sees that message's text in the excerpt, marked as unsent

#### Scenario: Row on Browse
- **WHEN** a user chooses Report… in the ⋯ menu of rin.trades's row on `/trade`
- **THEN** the dialog names no post, and the report reaches moderators without one

#### Scenario: Second post within a day
- **WHEN** kaede.k reports rin.trades's post "spares", then an hour later chooses Report this post… on rin.trades's post "doubles"
- **THEN** the second report is refused, saying when kaede.k can report rin.trades again, and nothing is filed

## ADDED Requirements

### Requirement: Reports with a Trade post attached
A report that names a Trade post SHALL carry it. The post SHALL be one of the reported account's have, want or sale lists, either half of a pair; a request naming another account's list, or a list of another type, SHALL be refused and nothing filed. A post whose list was deleted before the report arrives SHALL be left off, and the report SHALL be filed without it. A post SHALL not need to be on Trade when reported.

#### Scenario: From a post's menu
- **WHEN** kaede.k chooses Report this post… on rin.trades's WTS post "spares" and sends a scam report
- **THEN** the report reaches moderators naming "spares"

#### Scenario: Want half of a pair
- **WHEN** a report names the want list "wants" of rin.trades's WTT post "doubles" ⇄ "wants"
- **THEN** the report names the post "doubles" ⇄ "wants"

#### Scenario: Someone else's list
- **WHEN** a request reports rin.trades and names a list that belongs to mina.swaps
- **THEN** it is refused and nothing is filed

#### Scenario: Deleted before the report arrives
- **WHEN** rin.trades deletes "spares" while kaede.k's report dialog naming it is open, and kaede.k sends the report
- **THEN** the report is filed against rin.trades without a post

#### Scenario: Taken off Trade just before
- **WHEN** rin.trades takes "spares" off Trade a minute before kaede.k's report naming it arrives
- **THEN** the report is filed naming "spares", which is shown as not on Trade when reported

### Requirement: The post as it was reported
A report that names a post SHALL keep what the post was when the report was filed: its tags, the name and type of each of its lists, each list's description, and whether it was on Trade. Editing the post, taking it off Trade, deleting its lists or deleting the account SHALL not change what the report kept. Attaching a post SHALL add no message text.

#### Scenario: Edited after the report
- **WHEN** rin.trades renames "spares" to "trades" and rewrites its description after kaede.k reported it
- **THEN** the console still shows the report's post as "spares" with the old description

#### Scenario: Account deleted
- **WHEN** rin.trades, reported from the post "spares", deletes the account, which deletes its lists
- **THEN** the report still shows "spares" with its tags, lists and descriptions as reported

### Requirement: Reported posts in the console
On the moderator console's account page, each report that names a post SHALL show the post as reported, and its state now: still posted, taken off Trade, or deleted. While the list exists, it SHALL show the post's tags and list names as they stand now, mark what changed since the report, and link to the list page, whatever blocks, hiding or sanctions keep the post off Trade for anyone.

#### Scenario: Unchanged post
- **WHEN** a moderator opens rin.trades, reported from "spares", which is unchanged and still on Trade
- **THEN** the report shows "spares" with its tags, marked still posted, and a link to the list page

#### Scenario: Taken off Trade after the report
- **WHEN** rin.trades took "spares" off Trade after the report
- **THEN** the report shows "spares" as reported, marked taken off Trade, with the link to the list page

#### Scenario: Deleted after the report
- **WHEN** rin.trades deleted the list "spares" after the report
- **THEN** the report shows "spares" as reported, marked deleted, with no link

#### Scenario: Changed since the report
- **WHEN** rin.trades renamed "spares" to "trades" after the report
- **THEN** the report shows "spares" as reported and "trades" now, marked changed since the report

#### Scenario: Owner trade blocked
- **WHEN** a moderator trade-blocks rin.trades for a report naming "spares", then opens the account again
- **THEN** the report still shows "spares" as still posted, with its current tags and the link to the list page

#### Scenario: Resolved report
- **WHEN** a moderator dismissed kaede.k's report naming "spares", and rin.trades later deleted "spares"
- **THEN** the dismissed report shows "spares" as reported, marked deleted

#### Scenario: Reporter blocked the owner
- **WHEN** kaede.k reported "spares" with Also block on
- **THEN** the moderator sees "spares" as on any other report
