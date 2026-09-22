## Purpose

A Cosmo profile on `apps/web`: what an address owns, pinned and locked, at any date, plus
its trades, collection progress and statistics.

## ADDED Requirements

### Requirement: Profile layout and privacy
`/@<nickname>` SHALL resolve a nickname or address to a profile, show its banner, identity,
linked socials when the owner allows, four summary counts and tabs for Collection, Trades,
Progress, Statistics and Lists. A private profile SHALL show only the private guard to
anyone but its owner. The owner SHALL see an Edit action opening the profile edit dialog.
An unknown nickname SHALL show the not-found surface.

#### Scenario: Private profile
- **WHEN** a visitor who is not the owner opens a profile marked private
- **THEN** the guard is shown and no objekt, pin or transfer is requested

### Requirement: Owned collection with pins and locks
The Collection tab SHALL list owned objekts with serials, loading more as the user scrolls,
in the profile's configured column count when set. Pinned objekts SHALL appear first in a
shelf in the owner's order; the owner SHALL reorder them by drag and by keyboard, and pin,
unpin, lock and unlock objekts singly and in batch from the selection bar. Locked objekts
SHALL carry a lock mark; the lock filter SHALL cycle all, only locked, only unlocked.
Visitors SHALL see pins and locks but no actions.

#### Scenario: Reorder persists
- **WHEN** the owner drags the third pin to the first position and reloads
- **THEN** it is still first

#### Scenario: Lock tri-state
- **WHEN** the user cycles the lock filter twice from all
- **THEN** the URL is `locked=false` and only unlocked objekts show

### Requirement: Checkpoint view
The toolbar SHALL offer a date; choosing one SHALL put `at=<date>` on the URL and show the
objekts the address held at the end of that day, hide every mutating action and every pin
and lock mark, and keep the date across filter changes until cleared.

#### Scenario: Checkpoint hides actions
- **WHEN** the owner sets a checkpoint
- **THEN** the pinned shelf is gone, cards carry no pin or lock marks, and selecting cards offers no actions

### Requirement: Trades, progress and statistics
The Trades tab SHALL list the profile's transfers by type (all, mint, received, sent, spin)
with paging and hide them entirely when the owner hides transfers. The Progress tab SHALL
show per member and season how many of each class are owned versus total, excluding the
Welcome and Zero classes, with a chart per member. The Statistics tab SHALL chart the owned
collection by member and by season.

#### Scenario: Hidden transfers
- **WHEN** the owner hides transfers and a visitor opens Trades
- **THEN** the tab shows the hidden notice and no rows

#### Scenario: Progress excludes Welcome
- **WHEN** an address owns Welcome-class objekts
- **THEN** Progress totals do not count them
