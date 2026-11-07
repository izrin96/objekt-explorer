# Spec Delta

## Purpose

Pairs each COSMO Spin transfer with the objekt it produced, so every surface that lists transfers can show what a spin returned, that it broke, or that it is still pending.

## ADDED Requirements

### Requirement: Spin reward pairing
A spin is a transfer to the Spin address. Its reward SHALL be the earliest mint (a transfer from the null address) to the spinner that is at or after the spin, within 10 minutes of it, of the same artist as the spun objekt, and not already the reward of an earlier spin by the same spinner. Spins SHALL claim rewards in time order per spinner, first in first out, and a mint SHALL be the reward of at most one spin.

#### Scenario: Single spin
- **WHEN** an address spins an objekt at 11:33:18 and receives a mint of the same artist at 11:33:33
- **THEN** that mint is the spin's reward

#### Scenario: Next spin sent before the reward lands
- **WHEN** an address spins A at 12:00:00 and B at 12:00:05, then receives mints at 12:00:20 and 12:00:31
- **THEN** A's reward is the 12:00:20 mint and B's reward is the 12:00:31 mint

#### Scenario: Chained spin
- **WHEN** an address spins A, receives reward R, then spins R
- **THEN** R is A's reward, and R's own spin is paired with the next qualifying mint after it

#### Scenario: Unrelated purchase
- **WHEN** an address spins a tripleS objekt and the next mint it receives is an ARTMS objekt
- **THEN** that mint is not the spin's reward

### Requirement: Spin outcome
Every spin SHALL carry one outcome: `reward` when a reward is paired, `broke` when none is paired and the spin is older than 10 minutes, and `pending` when none is paired and the spin is 10 minutes old or younger. A pending spin SHALL NOT be shown as broke.

#### Scenario: Broke
- **WHEN** a spin is 15 minutes old and its spinner received no qualifying mint
- **THEN** its outcome is `broke`

#### Scenario: Pending
- **WHEN** a spin is 20 seconds old and no qualifying mint has been indexed yet
- **THEN** its outcome is `pending`

### Requirement: Spin row shows its outcome
A spin row on any page that lists transfers SHALL show the spun objekt together with its outcome: the reward objekt, opening the objekt drawer like any objekt cell; a broke label; or a pending label. The outcome SHALL be read the same whatever filter hides the reward's own row.

#### Scenario: Spin filter
- **WHEN** the user filters a transfer list to Spin
- **THEN** each spin row still shows its reward objekt, although no mint rows are listed

### Requirement: Reward folded into its spin in the All view
In a transfer list's All view, a mint paired as a spin reward SHALL NOT be listed as a row of its own; it SHALL appear only inside its spin row. When collection facets are set and the spin row is not in the list, the reward SHALL stay listed as a mint row, so a reward that matches the facets never disappears. The Mint filter SHALL still list it as a mint.

#### Scenario: All view
- **WHEN** the All view holds a spin and its reward
- **THEN** it shows one row for the pair

#### Scenario: Facets exclude the spun objekt
- **WHEN** the All view is filtered to member Seoyeon, and a Kaede objekt was spun for a Seoyeon reward
- **THEN** the reward is listed as a mint row

#### Scenario: Mint filter
- **WHEN** the user filters to Mint
- **THEN** the reward is listed as a mint row

### Requirement: Grouping can be turned off
`/activity` and the Activity history tab SHALL offer a Group spins toggle on their toolbar, on by default. Turned off, it SHALL put `spins=raw` on the URL, list spins and their rewards as plain transfers (a spin row shows only the spun objekt, and a reward is its own mint row in every view), and keep that across filter changes. Reset SHALL leave it as it is, since it is a view, not a filter.

#### Scenario: Raw view
- **WHEN** the user turns Group spins off in the All view
- **THEN** the URL carries `spins=raw`, spin rows show no outcome, and each reward is listed as a mint row

#### Scenario: Link keeps the view
- **WHEN** someone opens a link carrying `spins=raw`
- **THEN** the list opens ungrouped with the toggle off
