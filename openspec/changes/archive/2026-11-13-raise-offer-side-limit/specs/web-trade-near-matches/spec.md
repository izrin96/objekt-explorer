# Spec Delta

## MODIFIED Requirements

### Requirement: Near matches in the offer builder

When the builder adds matches, near matches of the same person, or of the same post, SHALL NOT be added. Under the added-matches line, one line SHALL read "N more if you sell: " (or swap, or buy) with their names, and offer Add it, which adds one copy each by the rules for matches, sell and swap from a want list under You give, swap and buy from a have or sale list under You get. Remove matches SHALL also take out what Add it added; its line counts only matches and names the rest.

#### Scenario: Opened from the row
- **WHEN** the viewer activates Make offer on sodalove's row
- **THEN** You give holds Kaede D338Z and D340Z, and a line reads "1 more if you sell: JiWoo D337Z" with Add it

#### Scenario: Add it
- **WHEN** the viewer activates Add it
- **THEN** the viewer's copy of D337Z is added under You give and the near line is gone

#### Scenario: Only near matches
- **WHEN** the viewer activates Make offer on a row whose strips hold near matches and no match
- **THEN** the builder opens empty with the near line and Add it

#### Scenario: A full side
- **WHEN** You give already holds 200 and the viewer activates Add it on a near line for that side
- **THEN** nothing past 200 is added, so Send is not blocked by the side limit

#### Scenario: Make offer with it, no copy to offer
- **WHEN** the viewer activates Make offer with it and their copy is reserved or can't be sent
- **THEN** the builder opens with the matches and says the objekt couldn't be added

#### Scenario: Make offer with it
- **WHEN** the viewer activates Make offer with it in the drawer of D337Z from sodalove's strip
- **THEN** the builder opens with the matches added and D337Z already added, as after Add it
