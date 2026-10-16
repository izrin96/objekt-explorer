## MODIFIED Requirements

### Requirement: Message a post's owner
Each post not owned by the viewer SHALL offer Message, under the rules in `web-chat`. Message SHALL open the conversation with the owner, adding a post card for the post (see `web-chat`), never an objekt card for one of its objekts. When the signed-in viewer has matches with the post's owner, as the post's match chip shows, the post card SHALL carry the match; otherwise it SHALL carry none. A post whose owner doesn't take messages from the viewer SHALL show "Not taking messages" in place of Message and Make offer.

#### Scenario: From a post
- **WHEN** a signed-in user with a linked address and no matches with rin.trades activates Message on rin.trades's WTT post
- **THEN** the conversation with rin.trades opens in the Inbox, with a post card for that post attached, and no objekt card

#### Scenario: From a post with matches
- **WHEN** a signed-in user whose match chip on mina's post shows matches both ways activates Message on it
- **THEN** the conversation opens with a post card carrying the match attached
