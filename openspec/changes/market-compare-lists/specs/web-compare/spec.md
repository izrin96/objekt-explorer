# Spec Delta

## ADDED Requirements

### Requirement: Pick one of your lists
With the target set to List, the Compare dialog SHALL offer a signed-in user a picker of their own lists, each shown with its type badge, leaving out the list being compared, and Other list…, which shows the field for a pasted link or ID. A user with no other list, or signed out, SHALL see the pasted field alone. While comparing against one of the viewer's own lists, the banner SHALL name the list by its name.

#### Scenario: Own list picked
- **WHEN** the owner of "binary hunt" opens Compare on it, sets the target to List, picks "spares" and compares
- **THEN** the URL carries `cmp_type=list` and `cmp_to` with the ID of "spares", and the banner names "spares"

#### Scenario: Other list
- **WHEN** the user picks Other list… and pastes a list's link
- **THEN** the comparison runs against that list, as a pasted link did before

#### Scenario: The list being compared
- **WHEN** the owner opens Compare on "binary hunt" and sets the target to List
- **THEN** the picker does not offer "binary hunt"

#### Scenario: No list of their own
- **WHEN** a signed-out visitor sets the target to List
- **THEN** the dialog shows only the field for a link or ID
