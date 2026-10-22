# Spec Delta

## MODIFIED Requirements

### Requirement: Order and idle posts
The feed SHALL list people, one row each. On Browse, people SHALL be ordered by the newest bump among their listed posts, newest first. On For you, Mutual orders people best match first and Any lists its Mutual and One way sections in their own order (see Matches and Compare with). Within a row, posts SHALL be ordered as Trade card says. Turning Show on Trade on SHALL count as a bump of that list, unless its owner bumped in the last 24 hours, in which case the list takes that bump's time, so neither switching a list off and on nor posting a new list skips the bump limit. Editing a list or its entries SHALL not move its post.

A post SHALL be idle when 30 days have passed since its last bump and since the last change to any of its lists or their entries. An idle post SHALL not be listed until it is bumped or changed, under every option, and its lists SHALL not count toward its owner's matches (see Matches to the signed-in viewer). A person with no listed post SHALL not be listed. The feed SHALL load more people as the viewer scrolls, 12 at a time, each row holding all of that person's posts the feed keeps.

The order SHALL be worked out once, when the feed opens, for its filters, Compare with choice and option, and SHALL hold while the viewer scrolls, for up to an hour. Loading more SHALL continue in that order, so no person is skipped or listed twice when a ranking or a bump changes between loads. A person in that order who no longer has a post the feed keeps SHALL be left out when their place is reached. A person who posts, bumps or starts matching after the feed opened SHALL be listed once the feed is opened again. Past the hour, loading more SHALL go on from the last person shown in the order as it stands then.

#### Scenario: Edit does not jump the queue
- **WHEN** an owner adds an entry to a list on Trade that was bumped 3 days ago
- **THEN** the owner's row keeps its place, and the list's time shows the change

#### Scenario: Idle post drops out
- **WHEN** a post was last bumped 31 days ago and none of its lists changed since
- **THEN** it is not listed on `/trade`

#### Scenario: Idle list does not count
- **WHEN** rin.trades's have list holds 3 collections the viewer wants but is idle, and rin.trades's listed want list asks for 1 collection on the viewer's bound have list
- **THEN** rin.trades's row reads "You have 1 they want", shows only the want list, and rin.trades is not listed under Mutual

#### Scenario: Idle under Mutual
- **WHEN** kaede.k would match the viewer mutually, but kaede.k's only post is idle
- **THEN** kaede.k is not listed under Mutual and is not counted in Mutual N

#### Scenario: Person ordered by their newest post
- **WHEN** rin.trades bumped a have list yesterday and a want list 10 days ago, and sodalove's only post was bumped 3 days ago
- **THEN** on Browse rin.trades's row, holding both lists, is listed above sodalove's

#### Scenario: Browse stays in bump order
- **WHEN** a signed-in viewer opens `/trade`, and a person matching them 5 ways last bumped before a person matching them none
- **THEN** the person matching none is listed first

#### Scenario: Twelve people a page
- **WHEN** 30 people have listed posts and the viewer scrolls past the first 12 rows
- **THEN** the feed loads the next 12 people, each with all of their listed posts, and no person is listed twice

#### Scenario: Bump while scrolling
- **WHEN** the viewer has loaded the first 12 people on Browse, and sodalove, who sits further down, bumps a post
- **THEN** sodalove is still listed at the place the feed opened with, once, and moves to the top only when the feed is opened again

#### Scenario: Leaves Mutual while scrolling
- **WHEN** under Any the viewer has loaded the first 12 people, and kaede.k, ranked lower in the Mutual section, stops being Mutual but still matches one way
- **THEN** kaede.k is still listed once, at the place the feed opened with

#### Scenario: Sold out before their place
- **WHEN** rin.trades is in the order the feed opened with, and sells the only objekt their posts held before the viewer reaches their place
- **THEN** rin.trades is not listed, and the page still fills with the people after them

#### Scenario: New poster waits for a reload
- **WHEN** mina.swaps puts a list on Trade after the viewer opened the feed
- **THEN** loading more does not list mina.swaps, and opening the feed again does
