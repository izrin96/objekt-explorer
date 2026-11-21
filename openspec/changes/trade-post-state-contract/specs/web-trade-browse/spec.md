## MODIFIED Requirements

### Requirement: Bump
A person with posts on Trade SHALL be able to bump once every 24 hours. A bump SHALL bump every one of their posts on Trade at once: it moves their row to the top of Browse and brings back every idle post. A bump within 24 hours of the person's last bump SHALL be refused, and the control SHALL show when the next bump is allowed. The last bump SHALL count a list turned on as a bump (see Order and idle posts), and a post since taken off Trade while it is still a post. It SHALL not count a want list that has since left every post, because it was unpaired while off Trade or the have or sale list it was paired with was deleted while it was off Trade. Only the signed-in person SHALL be able to bump their own posts.

#### Scenario: Bump moves the row up
- **WHEN** the owner, last bumped 26 hours ago, bumps
- **THEN** other viewers see their row first on `/trade` on their next load, and the Bump control shows the next bump in 24 hours

#### Scenario: Bump brings back every idle post
- **WHEN** the owner has three posts, two of them idle, and bumps
- **THEN** all three posts are listed, each bumped just now

#### Scenario: Too soon
- **WHEN** the owner, last bumped 3 hours ago, tries to bump
- **THEN** the bump is refused and their row keeps its place

#### Scenario: Off and on again
- **WHEN** the owner turns Show on Trade off and back on for a list, having bumped 3 hours ago
- **THEN** the list keeps the bump time from 3 hours ago

#### Scenario: New list within a day of a bump
- **WHEN** the owner bumped 3 hours ago and turns Show on Trade on for want list "binary hunt"
- **THEN** the list takes the bump time from 3 hours ago, and the owner's row keeps its place

#### Scenario: A bump whose post has ended
- **WHEN** the owner bumped 3 hours ago with one post, have list "spares" with want list "wants", then took it off Trade and deleted "spares", and now posts want list "binary hunt"
- **THEN** "binary hunt" takes the time it was posted as its bump, and the next bump is allowed 24 hours after that
