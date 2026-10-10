## MODIFIED Requirements

### Requirement: Freshness
The view SHALL reflect the user's own list changes on the next load. Other accounts' changes SHALL appear within 5 minutes.

The view SHALL say how fresh it is:
- under the controls, "Ownership checked <time ago>", the moment the shown matches were worked out, which can be up to 5 minutes before the load;
- on each partner row, after the reputation line, "updated <time ago>", the most recent change to any of the partner's matched lists or their entries.

Both times SHALL be relative, rendered by the browser, and in monospace. Each SHALL carry its full date and time as its machine-readable value.

#### Scenario: Own edit
- **WHEN** the user adds a collection to their want list and returns to For you
- **THEN** partners holding that collection are counted

#### Scenario: Checked time
- **WHEN** For you's matches were worked out 2 minutes before the user opens the page
- **THEN** the line under the controls reads "Ownership checked 2m ago"

#### Scenario: Partner updated
- **WHEN** rin.trades last changed one of their matched lists 2 hours ago
- **THEN** rin.trades's row reads "updated 2h ago" after their reputation line
