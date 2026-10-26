## MODIFIED Requirements

### Requirement: Offer cards in the thread
An offer SHALL appear in the thread as an offer card, in order with the other messages. The card shows:
- the O number;
- both sides, labelled from the viewer's side (You give, You get), each with its count of objekts;
- the top-up and the note;
- the current status.

Each side of a full card SHALL show its objekts as thumbnails in a grid, up to twelve: when the side holds more, the first eleven and a twelfth tile reading "+N" for the rest. An any-copy ask for several copies SHALL show its count on its thumbnail ("×3"), counted once in the grid. Each thumbnail SHALL name its objekt and serial to assistive technology and on hover. "+N", or choosing the side's count, SHALL open a sheet listing every objekt of that side as a line with its art, member, collection code and serial; a thumbnail SHALL open the objekt drawer.

The newest offer card is full, and older offer cards in the conversation collapse. A collapsed offer SHALL show, beside its O number, status and summary, small thumbnails of up to three objekts of You give, a swap mark, and up to three of You get, and the two sides' counts ("16 ⇄ 20") when either side holds more than three; an empty side shows nothing. A status change SHALL update the card in every open tab without a reload. The note gets the same caution line as a message, shown to the recipient only.

The full card SHALL be on the card surface and at most about 460 px wide, aligned to its sender's side. It SHALL have:
- a header row with the title, the O number and the status;
- the two sides next to each other, You give first, with a swap mark between them;
- a footer with the expiry and the actions.

When the card is narrower than about 448 px, as on a phone or beside the conversation list at `md`, the two sides SHALL stack, You give above You get, and the card SHALL take the thread's width. A collapsed offer SHALL use the same width and stay at full text contrast; its thumbnails SHALL not make the page scroll sideways.

#### Scenario: Live status
- **WHEN** the recipient accepts an offer while the sender has the thread open
- **THEN** the sender's card changes to Accepted, with a link to the trade

#### Scenario: Wide thread
- **WHEN** a user opens a thread holding an open counter-offer at 1280 px
- **THEN** the card shows You give and You get side by side, with the expiry and Decline, Counter and Accept in its footer

#### Scenario: Phone
- **WHEN** the same thread is opened at 390 px
- **THEN** You give sits above You get, the card fits the thread's width, and the page does not scroll sideways

#### Scenario: Large offer
- **WHEN** a thread holds an open offer giving 18 objekts for 22
- **THEN** You give shows 11 thumbnails and "+7", You get 11 and "+11", each side labelled with its count, and the card is no taller than an offer of twelve a side

#### Scenario: Every objekt
- **WHEN** the user chooses "+11" on You get
- **THEN** a sheet lists all 22 objekts of You get, each with its serial

#### Scenario: Several copies
- **WHEN** the offer asks for 3 copies of Lynn 301A in any serial
- **THEN** You get shows one Lynn 301A thumbnail marked "×3", and the side's count includes all three

#### Scenario: Collapsed offer
- **WHEN** a thread holds an older countered offer of SeoYeon 204Z for JiWoo 110A and Kaede 112A
- **THEN** its collapsed line shows the SeoYeon 204Z thumbnail, a swap mark, and the two other thumbnails beside "O-511 Countered"

#### Scenario: Collapsed large offer
- **WHEN** a thread holds an older countered offer of 16 objekts for 20
- **THEN** its collapsed line shows three thumbnails a side and "16 ⇄ 20"
