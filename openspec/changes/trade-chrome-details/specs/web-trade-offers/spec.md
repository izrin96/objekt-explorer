## MODIFIED Requirements

### Requirement: Offer builder
The builder SHALL open as a dialog, and as a full-height sheet on a phone. It shows:
- You give, with an Add picker over the sender's own objekts, entries on their bound have and sale lists first;
- You get, with an Add picker over the allowed list entries;
- the top-up and the note.

Each pickable objekt SHALL show its flags (not transferable, reserved, in another open offer). Send SHALL stay disabled until the offer holds at least one objekt.

Each picker SHALL narrow by member, season and class, and SHALL load more as it scrolls, 200 objekts at a time, so a long list does not land at once. Each SHALL also offer a matching switch:
- You give: "Only what they want", off by default, keeps collections on the partner's discoverable want lists.
- You get: "Only what I want", off by default, keeps collections on the sender's want lists.

An empty You get picker SHALL say why: the partner lists nothing the sender may ask for; nothing matches the filters; or the partner no longer holds anything they listed. The first reason SHALL win over the filters.

#### Scenario: Partner lists nothing
- **WHEN** the partner has only want lists and the sender opens You get's picker with "Only what I want" on
- **THEN** the picker says the partner lists nothing the sender can ask for, not that the filters match nothing

#### Scenario: Phone width
- **WHEN** the builder is open at 390 px
- **THEN** the two sides stack vertically, and the page doesn't scroll sideways

#### Scenario: Switches start off
- **WHEN** a sender with a want list opens the builder
- **THEN** both "Only what they want" and "Only what I want" are off, and You get's picker lists every entry the sender may ask for

## ADDED Requirements

### Requirement: Objekt data in monospace
On Trade pages, in offer cards in chat and in the offer builder, objekt data SHALL be set in the monospace font with tabular figures:
- O and T numbers;
- serials, with any "~" estimate mark;
- the "n/m" share of verified transfers;
- top-up amounts;
- the numbers in a reputation line (see `web-verified-trades`);
- counts shown as numbers beside a label, such as a section's "(N)".

Names of people, lists, collections and members, and sentences around these values, SHALL stay in the body font.

#### Scenario: My trades row
- **WHEN** the user sees an in-progress trade row with one of two transfers verified
- **THEN** "T-1042" and "1/2" are monospace, and the partner's name and the summary are not

#### Scenario: Reputation line
- **WHEN** a reputation line reads "31 verified · 100% · since Mar 2025"
- **THEN** "31" and "100%" are monospace and the words are not
