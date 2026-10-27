# Spec Delta

## ADDED Requirements

### Requirement: Reply to a message
Each text or card message that is not unsent, from either side, SHALL offer Reply in its "…" message menu, also past the unsend window. The menu SHALL show on hover and focus with a fine pointer and always on touch. Choosing Reply SHALL put "Replying to {name}", or "Replying to yourself", with the quoted text above the message box, move focus to the box rather than back to the menu's button, and send the next message as a reply to it.

#### Scenario: Reply to the partner
- **WHEN** izrin96 chooses Reply on haneul_07's "sent 2 already, check the trade page" and sends "got them both"
- **THEN** both see "got them both" with a quote of "sent 2 already, check the trade page" above it

#### Scenario: Focus after choosing Reply
- **WHEN** izrin96 opens a message's menu with the keyboard and chooses Reply
- **THEN** focus is in the message box, ready to type

#### Scenario: Old message
- **WHEN** izrin96 opens the menu on their own message from yesterday
- **THEN** it offers Reply and no Unsend

#### Scenario: Offer message
- **WHEN** izrin96 looks at an offer card in the thread
- **THEN** no Reply is offered on it

### Requirement: Stop replying
While replying, the line above the message box SHALL offer a control to stop replying, which moves focus to the box. Escape in an empty or filled box SHALL stop replying without clearing the text, unless an input method is composing text, when Escape SHALL leave the reply in place. Choosing Reply on another message SHALL replace the one being replied to.

#### Scenario: Escape
- **WHEN** izrin96 is replying with "ok" typed and presses Escape
- **THEN** the reply line goes, "ok" stays in the box, and sending it sends a plain message

#### Scenario: Escape while composing Korean
- **WHEN** izrin96, using a Korean keyboard and replying, presses Escape while "네" is still being composed
- **THEN** the reply line stays, and a second Escape after the composition ends stops replying

### Requirement: Reply drafts
The reply SHALL be kept with the conversation's unsent draft for the session, also while the box is empty. Choosing, changing or stopping a reply SHALL make the next send a new message, so a retry never posts with an earlier reply. A send that fails SHALL put both the text and the reply back, unless another reply was started meanwhile: then that newer reply stays and the failed text returns without its reply. The reply line SHALL never show the text of a message that has been unsent.

#### Scenario: Emptied box
- **WHEN** izrin96 starts a reply, types "ok", then deletes it
- **THEN** the reply line stays above the empty box

#### Scenario: Switch and back
- **WHEN** izrin96 starts a reply, opens another conversation, and comes back
- **THEN** the reply line and the typed text are still there

#### Scenario: Failed send
- **WHEN** a reply fails to send because the connection dropped
- **THEN** the text returns to the box with its reply line, and the send can be tried again

#### Scenario: Newer reply while sending
- **WHEN** izrin96's reply to message A is still sending, izrin96 chooses Reply on message B, and the send to A then fails
- **THEN** the failed text returns to the box, and the reply line names message B

#### Scenario: Quoted message unsent while replying
- **WHEN** izrin96 is replying to haneul_07's "wrong one, sorry" and haneul_07 unsends it
- **THEN** the reply line reads "Message unsent" and no longer shows "wrong one, sorry"

### Requirement: Reply quote
A reply SHALL show, above its bubble and in its sender's alignment, a one-line quote of the message it answers, with no "Replying to" label and at least 4.5:1 contrast in both themes. A message with text SHALL be quoted by its first line, cut at 120 code points with an ellipsis, even when it holds a card; a reply is quoted by its own text only. A card-only message SHALL be quoted as "Objekt card" or "Trade post". The full message is reached through the jump.

#### Scenario: Card quoted
- **WHEN** haneul_07 replies to izrin96's SeoAh 203Z objekt card
- **THEN** the quote reads "Objekt card"

#### Scenario: Trade post quoted
- **WHEN** haneul_07 replies to the Trade post card izrin96 attached
- **THEN** the quote reads "Trade post"

#### Scenario: Text and card
- **WHEN** haneul_07 replies to izrin96's "still have this one?" sent with an objekt card
- **THEN** the quote reads "still have this one?"

#### Scenario: Reply to a reply
- **WHEN** izrin96 replies to haneul_07's "got them both", which was itself a reply
- **THEN** the quote reads "got them both" and shows no quote inside it

#### Scenario: Long message
- **WHEN** haneul_07 replies to a message whose first line is 300 characters long
- **THEN** the quote shows its first 120 characters on one line, ending in an ellipsis

#### Scenario: Live
- **WHEN** haneul_07 sends a reply while izrin96 has the thread open
- **THEN** it appears with its quote within 2 seconds, with no reload

### Requirement: Jump to the quoted message
A reply's quote SHALL be a button whose accessible name is one sentence naming the sender, the quoted text and the action, such as "Reply to haneul_07: sent 2 already. Go to message". Activating it SHALL scroll to that message, loading up to 10 pages of older messages when it is not shown yet, then move focus to the message and highlight it briefly, without motion when the viewer prefers reduced motion. A message further back SHALL show "That message is too far back" instead.

#### Scenario: Jump back
- **WHEN** izrin96 activates the quote on a reply whose message is 3 pages back
- **THEN** older messages load, the thread scrolls to the quoted message, focus moves to it, and it is highlighted for a moment

#### Scenario: Too far back
- **WHEN** izrin96 activates a quote whose message is more than 10 pages back
- **THEN** a toast reads "That message is too far back to show"

### Requirement: Quote of a missing message
A quote whose message no longer exists SHALL read "Original message unavailable", and SHALL not offer a jump.

#### Scenario: Message gone
- **WHEN** izrin96 opens a thread holding a reply whose quoted message row no longer exists
- **THEN** its quote reads "Original message unavailable"

### Requirement: Quotes of unsent messages
A quote of a message that was unsent, before or after the reply was sent, SHALL read "Message unsent" and SHALL never show that message's text or card, also when the quoted message is not loaded in the thread. A quote whose message is unsent while the thread is open SHALL change within 2 seconds, as the message itself does. A reply that is itself unsent SHALL show "Message unsent" with no quote.

#### Scenario: Unsent after the reply
- **WHEN** haneul_07 unsends a message that izrin96 already replied to
- **THEN** the quote above izrin96's reply reads "Message unsent" for both of them

#### Scenario: Reply to a message being unsent
- **WHEN** izrin96 sends a reply to a message that haneul_07 unsent a moment earlier
- **THEN** the reply is sent, and its quote reads "Message unsent"

#### Scenario: Unsend heard before the reply
- **WHEN** haneul_07 unsends a message just as izrin96's reply to it is sent, and haneul_07's tab hears the unsend before the reply
- **THEN** the reply appears in haneul_07's tab with its quote reading "Message unsent"

#### Scenario: Unsent reply
- **WHEN** izrin96 unsends their reply "got them both"
- **THEN** both see "Message unsent" in its place, with no quote above it

### Requirement: Replies after a report or block
Replying SHALL be no special case after a report or a block: blocks gate sending as they do today, and a report's shared excerpt stays as it was filed.

#### Scenario: Reply after a report
- **WHEN** izrin96 reported haneul_07 from the conversation's menu without blocking, and later replies to one of haneul_07's messages
- **THEN** the reply is sent with its quote, and the report's shared excerpt is unchanged

### Requirement: Reply target checks
A send naming a message to reply to SHALL be refused with a "can't reply to that message" error when that message is not in the same conversation, does not exist, or is an offer. The refusal SHALL keep the typed text in the box. A send without a reply SHALL behave as it does today.

#### Scenario: Another conversation
- **WHEN** a request names a message from a conversation the sender is not reading
- **THEN** it is refused and nothing is posted
