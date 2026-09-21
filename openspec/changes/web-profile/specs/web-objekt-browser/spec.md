## ADDED Requirements

### Requirement: Lock filter is tri-state
The `locked` URL parameter SHALL be absent for all objekts, `true` for only locked and
`false` for only unlocked, and the control SHALL cycle through the three states in that order.

#### Scenario: Cycle
- **WHEN** the user activates the lock filter three times from the default
- **THEN** the URL goes `locked=true`, then `locked=false`, then no `locked` parameter
