## Purpose

Comparing a list against a profile's collection or another list on `apps/web`, to see what
is missing or what matches.

## ADDED Requirements

### Requirement: Compare on the URL
From a list the user SHALL choose a target (a profile by nickname or one of their lists)
and a mode (missing or matches); the choice SHALL live in `cmp_type`, `cmp_to` and
`cmp_mode` so the comparison survives reload and can be shared, and SHALL end when the
user clears it or opens another list. While comparing, a banner SHALL name the target and
mode, the grid SHALL show only the comparison result, and list edits SHALL remain available
to the owner.

#### Scenario: Missing against a profile
- **WHEN** the user compares a want list against a profile in missing mode
- **THEN** the URL carries the three parameters and the grid shows the entries that profile does not own

#### Scenario: Private target
- **WHEN** the target profile is private and the viewer is not its owner
- **THEN** the result is empty and the banner explains nothing could be compared
