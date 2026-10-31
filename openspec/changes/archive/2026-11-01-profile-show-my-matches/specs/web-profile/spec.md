# Spec Delta

## ADDED Requirements

### Requirement: Show my matches on a profile
On someone else's profile, a signed-in viewer SHALL have a Show my matches toggle in the Collection filter bar, off by default. On, the grid SHALL keep only the transferable objekts the profile holds whose collection is on any of the viewer's want lists, whatever each list's Open to, together with the filters. The shown count, selection bar, Add to list and Discord format SHALL read only those. The matches SHALL load only while the toggle is on.

#### Scenario: Turn it on
- **WHEN** a signed-in viewer opens a profile holding 1,200 objekts, 40 transferable ones in 12 collections on the viewer's want list "binary hunt", and turns on Show my matches
- **THEN** the grid shows only those 40 objekts and the count beside the toggle reads "12 you want"

#### Scenario: Not transferable
- **WHEN** the profile holds a copy of a wanted collection that cannot be transferred
- **THEN** that copy is not among the matches

#### Scenario: Buying-only want list
- **WHEN** the viewer's only want list holding a collection is open to buying only
- **THEN** the profile's transferable copies of that collection still match

### Requirement: Profile matches count
Beside the toggle, "N you want" SHALL count the matched collections and open "Matched with your lists", naming each want list behind them.

#### Scenario: Lists behind the count
- **WHEN** the matches come from want lists "binary hunt" and "SSS wants" and the viewer opens the count
- **THEN** the popover names both lists

### Requirement: Profile matches while loading or refused
While the matches load, the toggle SHALL show a spinner and the grid its loading skeleton. A refusal SHALL show its reason beside the toggle, and the grid SHALL stay hidden while the refusal stands, rather than show the collection unnarrowed.

#### Scenario: Loading
- **WHEN** the viewer turns the toggle on and the matches have not arrived
- **THEN** the grid shows its loading skeleton, not the whole collection

#### Scenario: Refused
- **WHEN** the matches request is refused for too many requests
- **THEN** the reason shows beside the toggle and no grid shows

### Requirement: Nothing matches on a profile
When no objekt matches, the page SHALL read "Nothing here matches your lists" with Show all, which turns the toggle off. It SHALL wait until every page of the collection has loaded before saying so.

#### Scenario: Nothing matches
- **WHEN** the viewer turns it on and, with every page loaded, none of the profile's objekts match
- **THEN** the page reads "Nothing here matches your lists" and Show all brings the whole collection back

#### Scenario: Pages still loading
- **WHEN** the first page holds no match and later pages are still loading
- **THEN** the grid shows its loading skeleton until the last page is in

### Requirement: Where profile matches show
The toggle SHALL NOT show on any of the viewer's own profiles, to a signed-out visitor, at a checkpoint (`at=<date>`), or on the Spin address.

#### Scenario: Own profile
- **WHEN** a signed-in user opens a profile at an address linked to their account
- **THEN** the Collection filter bar has no Show my matches toggle

#### Scenario: Checkpoint
- **WHEN** the viewer sets a checkpoint on someone else's profile
- **THEN** the toggle is gone and the grid shows the past state unnarrowed
