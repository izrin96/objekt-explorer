# Spec Delta

## MODIFIED Requirements

### Requirement: A hidden post comes back
A hidden post SHALL be unhidden, within the time a want-list alert takes, when its owner adds an entry by hand after the hide that matches a list of the user who hid it, in either direction, by the rules a want-list alert pairs lists with. The match SHALL be real when it is read: the offering side can trade a copy, whether or not the wanting side already holds one. The user's alert settings SHALL not change this. The Hidden dialog and Account's Hidden page SHALL say so.

#### Scenario: A new objekt the user wants
- **WHEN** the user hid rin.trades's post, and rin.trades then adds SeoYeon 204Z, which is on the user's want list and which rin.trades holds, to that post's have list
- **THEN** the post is no longer hidden, and is listed again on Browse and For you

#### Scenario: A new want the user has
- **WHEN** the user hid rin.trades's post, and rin.trades then adds Nien 205Z, which is on the user's bound have list and held by the user, to that post's want list
- **THEN** the post is no longer hidden

#### Scenario: Entries from before the hide
- **WHEN** the user hides a post that already holds SeoYeon 204Z, which is on their want list
- **THEN** the post stays hidden

#### Scenario: Nothing that matches
- **WHEN** the owner of a hidden post adds an objekt that is on none of the user's lists
- **THEN** the post stays hidden

#### Scenario: An entry a rule adds
- **WHEN** a rule on the hidden post's want list starts to want a collection the user offers, with nothing added by the owner
- **THEN** the post stays hidden

#### Scenario: Alerts switched off
- **WHEN** the user has want-list alerts off, and the owner of a post they hid adds an objekt on their want list
- **THEN** the post is no longer hidden, and no alert is created

#### Scenario: Already held
- **WHEN** the owner of a hidden post adds an objekt on the user's want list of which the user already holds a copy
- **THEN** the post is no longer hidden, as for an objekt the user does not hold yet

#### Scenario: Not owned yet
- **WHEN** the owner of a hidden post adds an objekt on the user's want list that the owner does not hold, and receives it 3 hours later
- **THEN** the post is unhidden once the owner holds it, within 24 hours of the entry
