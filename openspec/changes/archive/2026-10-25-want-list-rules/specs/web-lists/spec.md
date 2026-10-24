## ADDED Requirements

### Requirement: Want list rules
A want list SHALL hold rules beside its objekts. A rule is one of:
- **Any member of a collection**: a season and collection number, any member, with optional prio members;
- **Class, season and edition**: a class, a season, editions (or any edition) and any member or chosen members.

Each rule SHALL carry Skip ones I own, on by default. Only want lists SHALL hold rules; the server SHALL refuse a rule on any other list.

#### Scenario: Any member of a collection
- **WHEN** the owner of want list "binary hunt" adds the rule CC366, any member, prio YooYeon and NaKyoung
- **THEN** the list holds that rule, and every Cream02 366 collection of every member is wanted, whatever the prio

#### Scenario: Class, season and edition
- **WHEN** the owner adds the rule First, Cream02, 3rd edition, any member
- **THEN** cc117–cc120 of every member are wanted

#### Scenario: Not a want list
- **WHEN** a request adds a rule to have list "spares"
- **THEN** it is refused

### Requirement: What a rule wants
A rule SHALL want each collection it describes, except, with Skip ones I own on, one the owner holds on any linked address. What a rule wants SHALL follow new collections and the owner's holdings within 15 minutes. Its objekts SHALL count everywhere an objekt added by hand counts. A collection both on the list and in a rule SHALL count once.

#### Scenario: Owner gets one
- **WHEN** the owner of rule CC366, any member, receives YooYeon CC366 on a linked address
- **THEN** within 15 minutes the rule no longer wants YooYeon CC366, and its "can match" count drops by one

#### Scenario: Owner sends one away
- **WHEN** the owner sends Lynn CC366 to someone else
- **THEN** within 15 minutes the rule wants Lynn CC366 again

#### Scenario: Skip ones I own off
- **WHEN** the rule has Skip ones I own off
- **THEN** it wants every collection it describes, held or not

### Requirement: Rule limits
A rule SHALL describe at most 500 objekts before owned ones are skipped; a wider rule SHALL be refused, and the dialog SHALL say how many it covers and to pick a season or edition. With Skip ones I own on, a rule that has nothing left to match SHALL NOT be added, and the dialog SHALL say so and offer to turn Skip ones I own off.

#### Scenario: Too wide
- **WHEN** the owner sets First, any season, any edition
- **THEN** the dialog says how many objekts that covers and that a rule covers up to 500, and Add rule is disabled

#### Scenario: Nothing to match
- **WHEN** the owner holds every member's CC366 and sets the rule CC366, any member, with Skip ones I own on
- **THEN** the dialog reads "0 can match", says why, and Add rule is disabled until Skip ones I own is off

### Requirement: Add rule
The owner of a want list SHALL see an Add rule button in the list header, beside Find matches. It SHALL open a dialog with the two kinds of rule, the fields of the kind picked, Skip ones I own, and a live line naming the rule with how many objekts it covers, how many the owner holds and how many can match. Exact objekts SHALL still be added from the objekt pages, as today.

#### Scenario: Live count
- **WHEN** the owner picks First, Cream02, 3rd edition, any member, holding 18 of them
- **THEN** the dialog reads "Cream02 · FCO · 3rd · any member", "96 objekts · you own 18 · 78 can match"

#### Scenario: Visitor
- **WHEN** someone else opens the list
- **THEN** no Add rule button shows

### Requirement: Rules strip
A list holding rules SHALL show a Rules strip between its header and the filter bar: a header with the number of rules and how many objekts they can match, collapsible, and one row per rule with its label, what it skips, its "N can match" and, for the owner, a menu. The filters SHALL NOT hide rules. A rule's objekts SHALL stay out of the objekt grid and its count. A visitor SHALL see the strip without the menu.

#### Scenario: Strip
- **WHEN** "binary hunt" holds two rules matching 78 and 21 objekts and five objekts added by hand
- **THEN** the strip reads "Rules 2 · 99 can match" with one row per rule, and the grid shows the five objekts and reads "5 objekts"

#### Scenario: No rules
- **WHEN** a list holds no rules
- **THEN** no Rules strip shows

### Requirement: Rule menu
Each rule row's menu SHALL offer See the objekts, Edit rule, Turn into objekts and Delete rule. See the objekts SHALL expand the row into the rule's collections, one tab each with the number it can match, showing every member, the ones it skips faded. Turn into objekts SHALL replace the rule with the objekts it wants now, as objekts on the list.

#### Scenario: See the objekts
- **WHEN** the owner opens See the 96 objekts on the 3rd edition rule, holding 5 of cc117
- **THEN** the row expands with tabs cc117 · 19, cc118, cc119 and cc120, and cc117 shows 24 members with those 5 faded

#### Scenario: Turn into objekts
- **WHEN** the owner turns that rule into objekts
- **THEN** the rule is gone, the list holds its 78 objekts as objekts, and they no longer follow holdings

### Requirement: Any member from Add to list
The Add to list dialog, opened on one objekt with a want list picked, SHALL offer Any member of {collection}. Ticked, it SHALL add that rule, with the objekt's member as prio, instead of the objekt, and its button SHALL read Add rule. The option SHALL NOT show for other lists or for several objekts.

#### Scenario: From Lynn CC366
- **WHEN** a user opens Add to list on Lynn CC366, picks "binary hunt" and ticks Any member of CC366
- **THEN** the list gains the rule CC366, any member, prio Lynn, not Lynn CC366 alone

#### Scenario: Have list picked
- **WHEN** the user picks have list "spares"
- **THEN** the option does not show

### Requirement: Rules in exports
Share text, export and the Discord format SHALL write each rule as one line in its own words, before the objekts: "any CC366 (prio Lynn)", "any Cream02 FCO 3rd". Copy as new list SHALL keep the rules when the copy is a want list, and drop them, with the objekts they want, when it is not.

#### Scenario: Discord format
- **WHEN** the owner copies "binary hunt" in the Discord format
- **THEN** the Want part starts with "any CC366 (prio YooYeon, NaKyoung)" and "any Cream02 FCO 3rd", then the objekts, and no line per rule objekt
