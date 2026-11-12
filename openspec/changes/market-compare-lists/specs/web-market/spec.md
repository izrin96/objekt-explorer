# Spec Delta

## ADDED Requirements

### Requirement: Compare on Market
A signed-in user with a linked profile or a list SHALL have a Compare menu on `/market` with two groups: their profiles, and their lists, each list shown with its type badge. Picking a profile SHALL show only the collections that profile does not hold. Picking a list SHALL show only the collections on that list, those a rule wants included. The choice SHALL live in `cmp_type`, `cmp_to` and `cmp_mode`, and a banner SHALL name the target, a list by its name, and offer Cancel.

#### Scenario: One of my lists
- **WHEN** the user picks want list "binary hunt" in Market's Compare menu
- **THEN** the URL carries `cmp_type=list`, `cmp_to` with the list's ID and `cmp_mode=matches`, the banner names "binary hunt", and the grid shows only the listed collections that are on "binary hunt"

#### Scenario: A have list
- **WHEN** the user picks have list "spares"
- **THEN** the grid shows only the listed collections that are on "spares", with their listing counts and floor prices

#### Scenario: A profile
- **WHEN** the user picks one of their profiles
- **THEN** the grid shows only the listed collections that profile does not hold, as before

#### Scenario: Nothing listed
- **WHEN** nothing on the picked list is listed for sale
- **THEN** the page says nothing on that list is listed for sale

#### Scenario: Someone else's list in the URL
- **WHEN** the URL names a list that is not the user's own
- **THEN** Market ignores the comparison and shows the whole grid

#### Scenario: Cancel
- **WHEN** the user activates Cancel on the banner
- **THEN** the three parameters leave the URL and the whole grid returns
