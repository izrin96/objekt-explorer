# Spec Delta

## MODIFIED Requirements

### Requirement: Paged transfer feed
`/activity` SHALL list transfers newest first with sender, receiver, objekt and time,
loading older pages on demand, filtered by event type (`all`, `mint`, `transfer`, `spin`)
and by the collection facets, with the type carried on the URL. Nicknames the owner hides
SHALL be shown as addresses. Spin rows SHALL show their outcome, and the All view SHALL fold
spin rewards into their spin rows, as `web-spin-results` describes.

#### Scenario: Type filter
- **WHEN** the user selects Spin
- **THEN** the URL carries `type=spin` and every row's receiver is the spin address

#### Scenario: Spin with its reward
- **WHEN** the All view loads a spin whose reward was minted 15 seconds later
- **THEN** one row shows the spun objekt and the reward, and the reward has no row of its own

## ADDED Requirements

### Requirement: Live spin outcome
While `/activity` is open, a spin that arrives live SHALL show as pending, and when its reward arrives live the spin row SHALL show the reward in place: in the All view the reward SHALL NOT be prepended as a row of its own. A pending spin still without a reward 10 minutes after it was sent SHALL show as broke without a reload.

#### Scenario: Reward arrives after the spin
- **WHEN** a spin arrives live and its reward arrives 15 seconds later
- **THEN** the spin row changes from pending to the reward, and no new row appears for the reward

#### Scenario: Reward of a spin loaded with the first page
- **WHEN** the first page holds a pending spin and its reward then arrives live
- **THEN** that spin row shows the reward

#### Scenario: Spin turns broke
- **WHEN** a live spin receives no reward for 10 minutes while the page stays open
- **THEN** its row shows broke
