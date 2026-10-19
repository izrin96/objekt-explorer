# Spec Delta

## MODIFIED Requirements

### Requirement: Block a user
A signed-in user SHALL be able to block another account from a conversation's menu, a profile, or a person's row on Trade (see `web-trade-browse`). While the block lasts:
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
