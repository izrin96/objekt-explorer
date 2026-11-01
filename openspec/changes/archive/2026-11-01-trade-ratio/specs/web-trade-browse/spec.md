## ADDED Requirements

### Requirement: Ratio on post tiles
A Trade post's objekt tile and rule tile SHALL show its ratio (its own, or else its list's) as a chip ("1:2" on a have side, "2:1" on a want side) on Browse, For you and the full side list, when the side swaps: a have list, or a want list open to swaps. The chip's accessible name SHALL use words ("They ask 2 for this"). A ratio SHALL NOT change any count, ring or order on the page.

#### Scenario: Have tile
- **WHEN** jinsoul.blue's WTT post holds Lynn SCO with ratio 2 on its have list
- **THEN** that tile shows "1:2", named "They ask 2 for this", and the row's counts are as without it

#### Scenario: Rule tile
- **WHEN** the post's want list holds the rule "any Cream02 SCO" with ratio 2
- **THEN** that rule tile shows "2:1"

### Requirement: Ratio chips on special tiles
A want list set to Buying only SHALL show no ratio chips. A tile that folds several copies of one collection SHALL show the highest ratio among them.

#### Scenario: Buying only
- **WHEN** a WTB post's want list, set to Buying only, holds an entry with ratio 2
- **THEN** its tile shows no ratio chip

#### Scenario: Folded copies
- **WHEN** a have side holds two copies of Lynn SCO, one with ratio 2 and one with ratio 3, shown as one tile
- **THEN** the tile shows "1:3"
