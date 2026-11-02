# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Near matches in a list's dialog`
- TO: `### Requirement: Near matches in a list's sheet`

## MODIFIED Requirements

### Requirement: A near match is never counted

A near match SHALL NOT change any count or order: the row's header sentence and chip, a list's count, Can swap and the mutual score, For you's people, order and narrowing, the order of posts in a row, the "+N" tile and sheet tab counts, Show my matches' count, want-list alerts and notifications, chat post cards and their reply suggestions, or any API response outside the viewer's own reads described here.

#### Scenario: Counts stay
- **WHEN** sodalove's row holds 2 matches and 1 near match on "Set want tripleS"
- **THEN** the header still reads "You have 2 they want", the strip's count reads "2 you have", and sodalove's place in For you is unchanged

#### Scenario: No alert
- **WHEN** sodalove adds a collection to a Buying only want list that the viewer holds only on a have list
- **THEN** no "Someone wants what you have" alert is sent

### Requirement: Near matches in a list's sheet

A strip's "+N" sheet SHALL ring its near matches dashed, after the matches. When any are shown, a key SHALL name both rings: "On your lists" and "N more if you sell" (or swap, or buy). Its matching tab SHALL keep only matches; All SHALL hold the near matches.

#### Scenario: Tabs
- **WHEN** the viewer opens "Set want tripleS" from its "+N" tile
- **THEN** "2 you have" lists Kaede D338Z and D340Z, and All lists D337Z dashed after them
