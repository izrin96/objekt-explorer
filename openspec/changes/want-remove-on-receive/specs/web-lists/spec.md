# Spec Delta

## ADDED Requirements

### Requirement: Remove what a trade delivers
A want list's create and edit forms SHALL offer a switch, Remove objekts I get in a trade, on by default in the create form and off on every list made before it existed. No other list type SHALL offer it. While it is on, a collection the owner receives through a verified trade leg SHALL leave the list when the entry was added by hand (see `web-verified-trades` Received objekts leave want lists). An entry a rule added SHALL stay the rule's.

#### Scenario: New want list
- **WHEN** the user opens Create list and picks the want type
- **THEN** the switch shows, on, with a line saying an objekt received in a trade is taken off the list

#### Scenario: Existing want list
- **WHEN** the owner opens Edit on want list "binary hunt", made before the switch existed
- **THEN** the switch shows, off

#### Scenario: Other list types
- **WHEN** the user picks the have, sale or general type
- **THEN** no such switch shows, and a request that sets it on such a list saves it off

#### Scenario: Turned off for duplicates
- **WHEN** the owner turns the switch off on "binary hunt" and later receives Kim Lip 201A, which is on it, in a verified trade
- **THEN** Kim Lip 201A stays on "binary hunt"

#### Scenario: A tab from before the switch
- **WHEN** a tab opened before the deploy saves an edit to "binary hunt", whose switch is on
- **THEN** the switch stays on

#### Scenario: Copy as new list
- **WHEN** the owner copies "binary hunt", whose switch is on, as a new want list, and as a new have list
- **THEN** the want copy has the switch on, and the have copy has none
