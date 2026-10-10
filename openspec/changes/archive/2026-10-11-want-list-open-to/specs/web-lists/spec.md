## MODIFIED Requirements

### Requirement: Want list match option
A want list SHALL carry an **Open to** choice, set when it is created or edited and shown only for want lists, whether or not it is linked to a have list:
- **Trade only**, the default for a new want list: it matches entries on have lists only;
- **Trade or buy**: it matches entries on have lists and on sale lists.

Have, sale and general lists carry no choice. A have list's entry SHALL count against every want list. A sale list's entry SHALL count against a want list only when that want list is open to trade or buy. Linking a have list and a want list SHALL NOT change what either list matches. This applies wherever Trade matches a want list against a have or sale list:
- For you counts, in both directions;
- Browse match counts and Only matches;
- want-list alerts and "Someone wants what you have" alerts.

A request to create a want list that leaves the choice out SHALL save Trade only. An update that leaves it out SHALL keep the list's current choice. A want list made before Trade only became the default keeps the choice it had, Trade or buy.

#### Scenario: New want list
- **WHEN** a user creates a want list without touching Open to
- **THEN** Trade only is selected and saved

#### Scenario: Trades only skips a sale list
- **WHEN** the user's want list is open to Trade only, and a partner's sale list holds a collection on it
- **THEN** that collection does not count toward the partner in For you or Browse, and no want-list alert is sent for it

#### Scenario: Trades and sales
- **WHEN** the user switches the same want list to Trade or buy
- **THEN** the partner's sale entry counts toward them on the next load

#### Scenario: The other direction
- **WHEN** a partner's want list is open to Trade only and the user's sale list holds a collection on it
- **THEN** that collection does not count as "You have N they want" for that partner

#### Scenario: Pairing does not change matching
- **WHEN** the user links their have list "spares" to their want list "binary hunt", which is open to Trade only
- **THEN** "binary hunt" matches the same have lists as before and still no sale lists, and "spares" matches the same want lists as before, whether those are open to Trade only or Trade or buy

#### Scenario: Older want list
- **WHEN** a user opens the edit dialog of a want list made before this default
- **THEN** Trade or buy is selected, and saving without touching it keeps it

#### Scenario: Not a want list
- **WHEN** a user creates a have list
- **THEN** the form shows no Open to choice
