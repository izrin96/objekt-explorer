## ADDED Requirements

### Requirement: Matched through your rules
On For you, when a partner's objekts match the viewer's want lists only through the viewer's rules, the row SHALL name them under its strips, one line per objekt, up to three, then how many more: the objekt, "matches your rule", the rule's label and its want list. The header sentence SHALL add how many of the swap came through rules. Objekts matched by an objekt the viewer added by hand SHALL NOT be listed.

#### Scenario: Two through rules
- **WHEN** rin.trades has Lynn CC366 and Kaede CC118, which the viewer's want list "binary hunt" wants only through its rules CC366, any member, and Cream02 FCO 3rd
- **THEN** rin.trades's row reads "You can swap 2 · both through your rules", and under the strips "Lynn CC366 matches your rule CC366 · any member" and "Kaede CC118 matches your rule Cream02 · FCO · 3rd", each with "binary hunt"

#### Scenario: Wanted by hand too
- **WHEN** the viewer's list also holds Lynn CC366 as an objekt
- **THEN** Lynn CC366 is not listed under the strips

#### Scenario: Many through rules
- **WHEN** a partner's sale list holds 35 objekts the viewer wants only through rules
- **THEN** three lines show, then "32 more through your rules"
