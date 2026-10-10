## ADDED Requirements

### Requirement: Want list match option
A want list SHALL carry a Match with choice, set when it is created or edited and shown only for want lists:
- **Trades only**, the default for a new want list: it matches entries on have lists only;
- **Trades and sales**: it matches entries on have lists and on sale lists.

Have, sale and general lists carry no choice. A sale list's entry SHALL count against a want list only when that want list takes sales. This applies wherever Trade matches a want list against a have or sale list: For you counts in both directions, Browse match counts and Only matches, and want-list alerts. A request to create a want list that leaves the choice out SHALL save Trades only. An update that leaves it out SHALL keep the list's current choice. A want list made before Trades only became the default keeps the choice it had, Trades and sales.

#### Scenario: New want list
- **WHEN** a user creates a want list without touching Match with
- **THEN** Trades only is selected and saved

#### Scenario: Trades only skips a sale list
- **WHEN** the user's want list is Trades only, and a partner's sale list holds a collection on it
- **THEN** that collection does not count toward the partner in For you or Browse, and no want-list alert is sent for it

#### Scenario: Trades and sales
- **WHEN** the user switches the same want list to Trades and sales
- **THEN** the partner's sale entry counts toward them on the next load

#### Scenario: The other direction
- **WHEN** a partner's want list is Trades only and the user's sale list holds a collection on it
- **THEN** that collection does not count as "You have N they want" for that partner

#### Scenario: Older want list
- **WHEN** a user opens the edit dialog of a want list made before this default
- **THEN** Trades and sales is selected, and saving without touching it keeps it

#### Scenario: Not a want list
- **WHEN** a user creates a have list
- **THEN** the form shows no Match with choice
