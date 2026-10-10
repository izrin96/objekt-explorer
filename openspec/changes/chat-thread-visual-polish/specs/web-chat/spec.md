## ADDED Requirements

### Requirement: Message bubbles
The thread SHALL draw each text message as a bubble whose look depends on whose message it is:
- the viewer's own message: a neutral mid-gray fill with the normal foreground text colour, in light and dark. It SHALL never use the inverted foreground-on-background colours;
- the partner's message: the card surface with a 1 px border.

Both SHALL use normal-weight body text at the thread's text size. That text SHALL keep at least 4.5:1 contrast against the bubble in both themes.

Each bubble SHALL have rounded corners, with one smaller corner at the bottom on the sender's side (the right for the viewer, the left for the partner, mirrored in right-to-left).

Consecutive messages from one side that share a time stamp form a run, as the thread already groups them. In a run, each bubble that follows another bubble of the run SHALL also take the smaller corner at its top on the sender's side, so the run reads as one block.

A bubble SHALL be at most about 420 px wide, and at most 85% of the thread's width on narrow screens. Long words SHALL wrap inside it.

An unsent message SHALL keep its dashed, transparent "Message unsent" look with the bubble's shape. A card message, the caution line, the time and Seen SHALL stay as they are, and legible in both themes.

#### Scenario: Own message in dark
- **WHEN** a user in the dark theme sends "Still available?"
- **THEN** the bubble is mid-gray with light text, not white with dark text

#### Scenario: Own message in light
- **WHEN** the same user switches to the light theme
- **THEN** the bubble is a light gray with dark text, not black with white text

#### Scenario: Partner's message
- **WHEN** the partner's message is shown
- **THEN** its bubble is on the card surface with a visible 1 px border, aligned to the start side

#### Scenario: A run of three
- **WHEN** the partner sends three messages within a minute
- **THEN** the three bubbles join along the left side, only the last shows the time, and each has the smaller bottom-left corner

#### Scenario: Unsent in a run
- **WHEN** the middle message of a run is unsent
- **THEN** it shows "Message unsent" with a dashed outline in the same position and shape

### Requirement: Composer action labels
The message box's Attach objekt and Make offer actions SHALL show their text label beside their icon when the message box is at least 32rem wide. Narrower than that, as on a 390 px phone or beside the conversation list at `md`, they SHALL show the icon only and keep the same accessible name. Neither form SHALL make the page scroll sideways.

#### Scenario: Desktop
- **WHEN** a user opens a thread at 1280 px
- **THEN** the message box shows "Attach objekt" and "Make offer" as labelled buttons

#### Scenario: Phone
- **WHEN** the same thread is opened at 390 px
- **THEN** both actions are icon-only, a screen reader announces "Attach objekt" and "Make offer", and the text field keeps most of the row

### Requirement: Conversation context thumbnail
A conversation row in Inbox, Requests and Archived SHALL show a small thumbnail of the newest objekt card sent in that conversation that was not unsent. Next to it, in monospace, the row SHALL show the card's collection name and, for a specific objekt, its serial. A row whose conversation has no such card SHALL show no thumbnail and keep its layout. While the collection is unknown, its slug SHALL stand in for the art.

The thumbnail is part of the row: activating it opens the conversation, like the rest of the row, and it SHALL not be a separate control.

The conversation list request SHALL keep accepting every input it accepts today. A tab loaded before this change SHALL keep listing conversations and simply show no thumbnail.

#### Scenario: Started from a listing
- **WHEN** a conversation started with a SeoYeon 204Z #537 card and has since exchanged text and an offer
- **THEN** its row shows the SeoYeon 204Z art and "SeoYeon 204Z #537" under the latest message preview

#### Scenario: Newer card
- **WHEN** either side later sends a HyeRin 301Z card in that conversation
- **THEN** the row's thumbnail becomes HyeRin 301Z

#### Scenario: Card unsent
- **WHEN** the only card in a conversation is unsent
- **THEN** the row shows no thumbnail

#### Scenario: Text only
- **WHEN** a conversation holds only text messages
- **THEN** its row shows no thumbnail

## MODIFIED Requirements

### Requirement: Offer cards in the thread
An offer SHALL appear in the thread as an offer card, in order with the other messages. The card shows:
- the O number;
- both sides, labelled from the viewer's side (You give, You get);
- the top-up and the note;
- the current status.

The newest offer card is full, and older offer cards in the conversation collapse. A status change SHALL update the card in every open tab without a reload. The note gets the same caution line as a message, shown to the recipient only.

The full card SHALL be on the card surface and at most about 460 px wide, aligned to its sender's side. It SHALL have:
- a header row with the title, the O number and the status;
- the two sides next to each other, You give first, with a swap mark between them;
- a footer with the expiry and the actions.

When the card is narrower than about 448 px, as on a phone or beside the conversation list at `md`, the two sides SHALL stack, You give above You get, and the card SHALL take the thread's width. A collapsed offer SHALL use the same width and stay at full text contrast.

#### Scenario: Live status
- **WHEN** the recipient accepts an offer while the sender has the thread open
- **THEN** the sender's card changes to Accepted, with a link to the trade

#### Scenario: Wide thread
- **WHEN** a user opens a thread holding an open counter-offer at 1280 px
- **THEN** the card shows You give and You get side by side, with the expiry and Decline, Counter and Accept in its footer

#### Scenario: Phone
- **WHEN** the same thread is opened at 390 px
- **THEN** You give sits above You get, the card fits the thread's width, and the page does not scroll sideways
