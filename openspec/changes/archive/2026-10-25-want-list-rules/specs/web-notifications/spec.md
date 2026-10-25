## ADDED Requirements

### Requirement: Alerts from rules
A want list's rules SHALL alert like its objekts, under the same match choice, grouping and exclusions: a new listing of an objekt a rule wants alerts the rule's owner, and an objekt a rule newly wants alerts the owners of matching have and sale lists who turned that alert on. A rule's objekts changing as the owner's holdings change SHALL NOT alert a want list, source list and collection that already alerted.

#### Scenario: Listing matches a rule
- **WHEN** rin.trades lists Lynn CC366 on a have list on Trade, and the user's want list "binary hunt" wants it only through the rule CC366, any member
- **THEN** the user gets the want-list alert for "binary hunt" naming Lynn CC366, as for an objekt added by hand

#### Scenario: Wanted again after a trade
- **WHEN** the user sends Lynn CC366 away, so the rule wants it again, and spares, which already alerted for it, still lists it
- **THEN** no second alert is created for spares and Lynn CC366
