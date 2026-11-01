## ADDED Requirements

### Requirement: Trade ratio
An entry of a have or want list, and a want-list rule, SHALL carry a trade ratio: a whole number from 2 to 5, or none, which reads as 1:1. On a have entry it is how many the owner asks for one copy, shown as "1:N". On a want entry or rule it is how many the owner would give for one, shown as "N:1". A ratio SHALL never change what a list, entry or rule matches, nor any count, ranking or alert. Sale and general lists SHALL carry no ratio.

#### Scenario: Have entry asks two
- **WHEN** the owner of have list "spares" sets ratio 2 on their Lynn SCO
- **THEN** the entry reads "1:2", and every match count that includes it is unchanged

#### Scenario: Want rule gives two
- **WHEN** the owner sets ratio 2 on the rule "any Cream02 SCO"
- **THEN** the rule reads "2:1", and it wants the same collections as before

#### Scenario: Not on a sale list
- **WHEN** a request sets a ratio on an entry of sale list "binary sale"
- **THEN** it is refused, and the entry is unchanged

#### Scenario: Out of range
- **WHEN** a request sets ratio 6, or 1, on a have entry
- **THEN** it is refused

### Requirement: Ratio for the whole list
A have or want list SHALL carry its own ratio, from 2 to 5 or none, which every entry and rule of the list without its own ratio SHALL follow. The owner SHALL set it as "Ratio for all" in the list's Edit form. Saving the form from a tab opened before ratios existed SHALL keep the list's ratio.

#### Scenario: Everything follows the list
- **WHEN** the owner sets "Ratio for all" on have list "spares" to 2, and Lynn SCO has its own ratio 3
- **THEN** every other entry of "spares" reads "1:2", and Lynn SCO reads "1:3"

#### Scenario: Rules follow too
- **WHEN** want list "binary hunt" has "Ratio for all" 2 and the rule CC366 has none of its own
- **THEN** the rule reads "2:1"

#### Scenario: Old tab saves the form
- **WHEN** a tab opened before ratios existed saves the edit form of "spares", whose ratio is 2
- **THEN** "spares" still has ratio 2

### Requirement: Set ratio
The owner of a have or want list SHALL be able to set or clear the ratio of one or more selected entries from the list page, through a Set ratio action beside the other entry actions, choosing 1:1 (none) or 2 to 5. The entries a rule keeps SHALL take their ratio from the rule only, so Set ratio SHALL leave them out. Setting a ratio SHALL NOT count as a bump of the list.

#### Scenario: Several at once
- **WHEN** the owner selects three entries of "spares" and sets ratio 3
- **THEN** each of the three reads "1:3", and the list's place in the Trade feed is unchanged

#### Scenario: Clear
- **WHEN** the owner sets 1:1 on an entry that read "1:3"
- **THEN** the entry shows no ratio

#### Scenario: Visitor
- **WHEN** someone else opens "spares"
- **THEN** no Set ratio action shows

### Requirement: Ratio on rules
The Add rule and Edit rule dialogs SHALL offer a Ratio choice, 1:1 by default, and the Rules strip SHALL show a rule's ratio beside its label. Editing a rule without touching its ratio SHALL keep the ratio, including an edit sent by a tab opened before ratios existed.

#### Scenario: Add a rule with a ratio
- **WHEN** the owner adds the rule CC366, any member, with ratio 2
- **THEN** the Rules strip row reads "tripleS · CC366 · any member" with "2:1"

#### Scenario: Old tab edits a rule
- **WHEN** a tab opened before ratios existed edits the members of a rule whose ratio is 2
- **THEN** the rule's ratio is still 2

### Requirement: Ratio on the list page
A card on the list page whose entry has a ratio, its own or the list's, SHALL show it as a chip; for the owner, a ratio followed from the list SHALL look apart from one set on the entry. The owner SHALL read "You ask N for this" (have) or "You'd give N for this" (want) as the chip's accessible name and tooltip. Everyone else, signed out too, SHALL read "They ask N for this" or "They'd give N for this".

#### Scenario: Owner and visitor
- **WHEN** "spares" holds Lynn SCO with ratio 2
- **THEN** its card shows a "1:2" chip, named "You ask 2 for this" for the owner and "They ask 2 for this" for anyone else

### Requirement: Ratio in copies and exports
Copy as new list SHALL keep the list's ratio and each entry's when the copy has the same list type as its source, and drop them otherwise. A rule SHALL keep its ratio in a copy. Turn into objekts SHALL give the rule's ratio to each objekt it adds. The CSV export SHALL carry a `ratio` column, empty for none, for entries and for rule rows. The Discord format SHALL NOT show ratios.

#### Scenario: Same type keeps it
- **WHEN** the owner copies have list "spares", whose Lynn SCO reads "1:2", as a new have list
- **THEN** the copy's Lynn SCO reads "1:2"

#### Scenario: Other type drops it
- **WHEN** the owner copies "spares" as a want list
- **THEN** no entry of the copy has a ratio

#### Scenario: Turn into objekts
- **WHEN** the owner turns the rule CC366 with ratio 2 into objekts
- **THEN** each objekt it adds reads "2:1"

#### Scenario: CSV
- **WHEN** the owner exports "spares" as CSV
- **THEN** the Lynn SCO row has `2` in the `ratio` column, and rows with no ratio leave it empty
