## ADDED Requirements

### Requirement: Picks in the builder
Each side of the offer builder SHALL show its picks as a grid of small cards, as many a row as the side's width allows (six at the dialog's full width, four on a phone), each with its art, collection code and serial (or its any-copy count) and a remove button named for the objekt. The grid SHALL scroll inside its side, so the top-up, the note and the footer stay in reach whatever the count. A pick's warnings SHALL show with its card.

#### Scenario: Large offer
- **WHEN** the sender holds 24 picks under You give and 31 under You get
- **THEN** each side shows its picks six a row, scrolling within the side, and the top-up, note and Send stay on screen

#### Scenario: Remove one
- **WHEN** the sender chooses the remove button on SeoAh 203Z #722
- **THEN** that pick leaves the side, and the side's count drops by one

#### Scenario: Several copies
- **WHEN** You get holds 3 copies of Lynn 301A in any serial
- **THEN** one card shows Lynn 301A marked "×3"

### Requirement: Picks that can't be sent
A pick that can't be sent (not on their lists, in a trade in progress, not transferable, more copies than are spare, or refused when sent) SHALL be outlined and name its reason under its card. Its side SHALL carry a banner counting such picks, with their reasons, and Remove them, which takes only those picks out. The footer SHALL say why Send is disabled while any remain.

#### Scenario: Two blocked
- **WHEN** You get holds 31 picks, one no longer on the partner's lists and one in a trade in progress
- **THEN** both cards are outlined with their reasons, You get's banner reads that 2 can't be offered, and Send is disabled with the footer saying why

#### Scenario: Remove them
- **WHEN** the sender chooses Remove them in that banner
- **THEN** the two picks leave You get, the other 29 stay, and the banner goes away

#### Scenario: Refused on send
- **WHEN** the server refuses the offer naming one objekt as no longer owned
- **THEN** that card is outlined as refused and counted in its side's banner
