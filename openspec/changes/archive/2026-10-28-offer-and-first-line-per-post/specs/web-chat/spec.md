## MODIFIED Requirements

### Requirement: Suggested first line
While a conversation has no messages and the user can send, the message box SHALL offer one-tap suggestions that fill the box without sending. One suggestion SHALL match the attached card:
- an objekt card from a sale list: asking whether it is still for sale;
- an objekt card from a have list: asking whether they would trade it;
- an objekt card from a want list: offering it;
- a post card for a WTS post: "Hi! Is this still for sale?", whatever match it carries;
- a post card for a WTB post: when the sender has some of what the owner wants, "Hi! I have one you're after. Interested?" (or "some", for more than one); otherwise "Hi! Saw your post. Still looking?";
- a post card for a WTT post matching both ways, when the sender could swap with the owner as the card was sent (the owner's row read "You can swap N"): "Hi! We match on a few. Want to swap?";
- a post card for a WTT post matching both ways when they could not swap: the one-way suggestion below for the direction with more matches, the owner's direction on a tie;
- a post card for a WTT post matching one way: "Hi! You have one I'm after. Open to an offer?" when the owner has what the sender wants, or "Hi! I have one you're after. Interested?" the other way (each with "some" for more than one);
- a post card for a WTT post without a match: "Hi! Saw your post. Open to a swap?".

A post card saved before the card recorded whether the two could swap SHALL read as one they could swap with. A post card SHALL never offer the have or want objekt card suggestions. Without a card the suggestions SHALL be general.

#### Scenario: Sale card
- **WHEN** a user opens a new conversation from a Market listing
- **THEN** the message box offers "Hi! Is this still for sale?", and tapping it fills the box without sending

#### Scenario: Post card from Browse
- **WHEN** a user opens a new conversation from Message on a Browse WTT post they have no matches with
- **THEN** the message box offers "Hi! Saw your post. Open to a swap?" and not "Hi! Would you trade this one?"

#### Scenario: Post card for a sale post
- **WHEN** a user opens a new conversation from Message on a WTS post
- **THEN** the message box offers "Hi! Is this still for sale?" and not "Hi! Saw your post. Open to a swap?"

#### Scenario: Post card from a Can swap row
- **WHEN** a user opens a new conversation from Message on jun.p's row, which reads "You can swap 1", and the card carries "They have 1 you want · You have 1 they want"
- **THEN** the message box offers "Hi! We match on a few. Want to swap?"

#### Scenario: Post card matching both ways across posts
- **WHEN** a user opens a new conversation from Message on mina.k's row, which reads "They have 2 you want · You have 1 they want" with no Can swap mark
- **THEN** the message box offers "Hi! You have some I'm after. Open to an offer?" and not "Hi! We match on a few. Want to swap?"

#### Scenario: An older post card
- **WHEN** a conversation's newest card is a post card sent before this change, carrying a match both ways, and the conversation has no messages
- **THEN** the message box offers "Hi! We match on a few. Want to swap?"

#### Scenario: Not after the first message
- **WHEN** the conversation has any message
- **THEN** no suggestions are shown
