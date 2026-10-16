## MODIFIED Requirements

### Requirement: Freshness
Matching SHALL reflect the user's own list changes on the next load. Other accounts' changes SHALL appear:
- within 5 minutes in Mutual, its order, Mutual N, and the order of For you's Mutual and One way sections under Any (see `web-trade-browse` Matches and Compare with);
- within 1 minute in the person sheet;
- on the next load in the chips.

The person sheet SHALL say how fresh it is:
- "Ownership checked <time ago>": the moment its matches were worked out;
- "updated <time ago>": the most recent change to any of the person's matched lists or their entries.

Both times SHALL be relative, rendered by the browser, and in monospace. Each SHALL carry its full date and time as its machine-readable value.

#### Scenario: Own edit
- **WHEN** the user adds a collection to their want list and returns to Browse
- **THEN** posts holding that collection are counted and ringed

#### Scenario: One way order catches up
- **WHEN** sodalove adds 6 collections the user wants to their have list, and the user reloads For you 5 minutes later
- **THEN** sodalove's posts have moved up in One way by their new count

#### Scenario: Checked time
- **WHEN** a person sheet's matches were worked out 30 seconds before the user opens it
- **THEN** it reads "Ownership checked" with a time under a minute ago

#### Scenario: Partner updated
- **WHEN** rin.trades last changed one of their matched lists 2 hours ago
- **THEN** rin.trades's sheet reads "updated 2h ago" after their reputation line
