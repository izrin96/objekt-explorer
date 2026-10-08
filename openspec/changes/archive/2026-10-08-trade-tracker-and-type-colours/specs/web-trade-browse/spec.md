## ADDED Requirements

### Requirement: Trade colours
Trade cards on Browse and For you SHALL colour their type marks and match line (see `web-lists` List type colours):
- post tags and list badges take their list type's colour;
- "They have N you want" is amber, the want colour, since it fills one of the viewer's want lists;
- "You have N they want" is teal, the have colour, since it comes off one of the viewer's have lists;
- "Mutual N" is an indigo chip.

On For you, the "They have, you want" and "You have, they want" headings SHALL take the same colours as their counts. Cards, buttons, avatars and backgrounds SHALL stay neutral.

#### Scenario: A WTS post
- **WHEN** the viewer sees a WTS post that has 3 collections on the viewer's want lists
- **THEN** its WTS tag and Sale badge are rose, and "They have 3 you want" is amber

#### Scenario: Mutual partner
- **WHEN** a For you card reads "They have 14 you want · You have 2 they want · Mutual 2"
- **THEN** the first count and its section heading are amber, the second and its heading teal, and Mutual 2 is an indigo chip
