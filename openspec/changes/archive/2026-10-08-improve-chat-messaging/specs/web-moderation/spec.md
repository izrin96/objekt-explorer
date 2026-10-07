## MODIFIED Requirements

### Requirement: Report a user
A signed-in user SHALL be able to report another account from a conversation's menu, a Trade post's menu or a profile, choosing:
- a reason: scam or fake offer, harassment, spam, pretending to be someone else, or something else;
- an optional note of up to 500 characters;
- "Share this conversation with moderators", on by default and offered only from a conversation;
- "Also block", off by default.

A shared excerpt SHALL be a copy of every message of that conversation at the time of the report, kept with the report; later messages, unsends or deletions SHALL not change it. A message unsent before the report SHALL be in the excerpt with its text and card, marked as unsent. The excerpt SHALL be the only way message text reaches moderators. A user SHALL be able to report the same account at most once per 24 hours.

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
