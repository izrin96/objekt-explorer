## MODIFIED Requirements

### Requirement: Block a user
A signed-in user SHALL be able to block another account from a conversation's menu, a profile, a Trade post or a person sheet (see `web-trade-for-you`). While the block lasts:
- the blocked account SHALL not be able to start a conversation with the blocker or send messages in their conversation, and SHALL not be told why (the refusal reads the same as "this user isn't accepting messages");
- the conversation SHALL leave the blocker's Inbox, Requests and badge;
- the blocked account's posts SHALL leave the blocker's Trade feed and matches;
- the blocker SHALL get no want-list alerts from or about the blocked account.

Feeds and alerts SHALL apply the block in both directions: the blocker's posts, matches and want-list alerts also leave the blocked account's views. Either account can still open the other's public profile and lists.

No response to either account SHALL say that a block caused something: an offer cancelled by a block SHALL carry no cancel reason in any offer, trade or notification response, to either party.

#### Scenario: Blocked sender
- **WHEN** kaede.k blocks spam.seller22 and spam.seller22 then sends a message in their conversation
- **THEN** the send is refused with the generic reason, and kaede.k receives nothing

#### Scenario: Feeds
- **WHEN** kaede.k blocks rin.trades
- **THEN** rin.trades's posts no longer appear for kaede.k and rin.trades does not match kaede.k, and kaede.k's no longer appear for rin.trades

#### Scenario: Offer cancelled by a block
- **WHEN** kaede.k blocks spam.seller22 while O-882 between them is open, and spam.seller22 reads O-882 and its notification through the API
- **THEN** O-882 is Cancelled, and neither response carries a reason naming the block

### Requirement: Scam-phrase caution
A received message matching a scam pattern SHALL show the recipient an inline caution under the message. The patterns cover asking the other side to send first, and payment outside the site (payment links and app names). Matching SHALL see through disguises that do not change how the text reads: invisible format characters (such as zero-width spaces) are ignored, and full-width and other compatibility forms match their plain letters. The message SHALL be stored and shown as sent. The sender SHALL see nothing. Each match SHALL record a flag on the sender with its category and time, without the message text. Flags SHALL never block or hide a message.

#### Scenario: Send first
- **WHEN** a recipient gets "send first pls, pay to wise"
- **THEN** the message is shown with the caution, and moderators see one "send first" and one "outside payment" flag on the sender, without the text

#### Scenario: Disguised app name
- **WHEN** a recipient gets "pay by pay​pal" with a zero-width space, or "ｐａｙｐａｌ" in full-width letters
- **THEN** the message is shown as sent, with the outside-payment caution, and the flag is recorded
