## ADDED Requirements

### Requirement: Rules on a post
A post whose want list holds rules SHALL show each rule in its Want strip as one tile, before the objekts: marked RULE in its class colour, with its label ("CC366", "Cream02 FCO 3rd") and "any member" or its members. Activating a tile SHALL list the rule's objekts the viewer has.

#### Scenario: Rule tile
- **WHEN** jinsoul.blue's WTT post wants the rule CC366, any member, and the viewer's bound have list holds Lynn CC366 and Nien CC366
- **THEN** the Want strip starts with one CC366 tile reading "any member" and "2 you have", ringed, and no card per member

### Requirement: Rule counts on a post
For a signed-in viewer, each rule tile SHALL read "N you have", N being the rule's objekts on the viewer's bound have lists, still owned, by the rules of Matches to the signed-in viewer, and SHALL carry the match ring when N is above zero. A rule's objekts SHALL count in the person's header sentence, the list's count and Can swap like objekts added by hand.

#### Scenario: Counted like objekts
- **WHEN** that post's want list also holds the 3rd edition rule, of which the viewer has 2, and Kotone CC302, which the viewer has, and jinsoul.blue has 4 the viewer wants
- **THEN** the row reads "You can swap 4 · They have 4 you want · You have 5 they want"

#### Scenario: Signed out
- **WHEN** a visitor without a session sees the post
- **THEN** the rule tiles show their labels with no count and no ring

## MODIFIED Requirements

### Requirement: Tag help
The matching help (the ? beside Mutual only) SHALL be tables only, with no bulleted sentences, in four sections: Post tags, What matches your want list, What counts toward Mutual, and Good to know. A yes or no cell SHALL show a mark, with its word for screen readers.

#### Scenario: Post tags
- **WHEN** the viewer opens the matching help
- **THEN** the tag table describes WTT as a Swap post, WTB as a Buy post or a Swap post that would also pay, and WTS as a Sell post, each with what it matches, and notes that a Swap post that would also pay carries WTT and WTB

#### Scenario: Open to grid
- **WHEN** the viewer reads What matches your want list
- **THEN** their have list is marked for Swaps only and Swaps or buying and not for Buying only, their sale list for Swaps or buying and Buying only and not for Swaps only, and a note says it works the same the other way

#### Scenario: Mutual table
- **WHEN** the viewer reads What counts toward Mutual
- **THEN** a have list against a want list open to swaps is marked yes, a sale list on either side and a want list set to Buying only are marked no, and a note says the score is the smaller of the two sides

#### Scenario: Good to know
- **WHEN** the viewer reads Good to know
- **THEN** labelled rows say that all of a person's lists count together, what Compare with narrows to, that only objekts still owned and transferable count, that hidden and blocked people never show, and that a want list's rule counts like the objekts it covers, once per collection, and shows on a post as one RULE tile with how many of the viewer's it takes, and no bulleted sentences follow
