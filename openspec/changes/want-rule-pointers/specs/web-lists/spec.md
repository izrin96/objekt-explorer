# Spec Delta

## MODIFIED Requirements

### Requirement: Add rule
The owner of a want list SHALL see an Add rule button in the list header, beside Find matches. It SHALL open a dialog with the two kinds of rule as choices that each say what they take and show an example ("One collection, every member", e.g. any CC366; "Every collection of a class, for the members you pick", e.g. Cream02 FCO 3rd, and that any class and any season cover every objekt of a member), the fields of the kind picked, Skip ones I own, and a live line naming the rule with how many objekts it covers, how many the owner holds and how many can match. Exact objekts SHALL still be added from the objekt pages, as today. The owner of a want list with no objekts SHALL also be offered Add rule in the empty list, beside Browse objekts, with a line saying a rule wants everything they are missing of a member or class.

#### Scenario: Live count
- **WHEN** the owner picks First, Cream02, 3rd edition, any member, holding 18 of them
- **THEN** the dialog reads "tripleS · Cream02 · FCO · 3rd · any member", "96 objekts · you own 18 · 78 can match"

#### Scenario: Each kind explains itself
- **WHEN** the owner opens Add rule
- **THEN** Any member of a collection reads "One collection, every member." with "e.g. any CC366: Lynn CC366, Nien CC366 …", and Class, season and edition reads "Every collection of a class, for the members you pick." with "e.g. Cream02 FCO 3rd: 117Z to 120Z, every member. Or any class and season: every SeoYeon objekt"

#### Scenario: Visitor
- **WHEN** someone else opens the list
- **THEN** no Add rule button shows

#### Scenario: Changing the artist
- **WHEN** the owner has typed collection number 366 under tripleS and switches the artist to ARTMS
- **THEN** the collection number is cleared, the season moves to ARTMS's newest, the class stays if ARTMS has it and otherwise becomes ARTMS's first class, and the editions, members and priority members are cleared, so the dialog never carries over a number or class the new artist doesn't have

#### Scenario: Empty want list
- **WHEN** the owner opens their want list "binary hunt", which holds no objekts
- **THEN** the empty list says to tick cards and choose Add to list, or to add a rule to want everything they are missing of a member or class, and offers Browse objekts and Add rule, which opens the Add rule dialog

#### Scenario: Empty have list
- **WHEN** the owner opens their have list "spares", which holds no objekts
- **THEN** the empty list offers no Add rule
