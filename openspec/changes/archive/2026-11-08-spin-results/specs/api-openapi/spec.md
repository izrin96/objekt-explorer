# Spec Delta

## ADDED Requirements

### Requirement: Spin outcome fields on transfer rows
Each row of `GET /activity` and `GET /transfers/{address}` that is a spin SHALL carry a `spin` object with `outcome` (`reward`, `broke` or `pending`, as `web-spin-results` defines) and, when the outcome is `reward`, `reward` holding the reward's transfer and objekt in the shape of a row's own `transfer` and `objekt`. A mint row paired as a reward SHALL carry `rewardOf`, the spin transfer's ID. Both fields are additive: every other field, the rows returned and their order SHALL stay as before.

#### Scenario: Spin with a reward
- **WHEN** a client requests `GET /api/v1/activity?type=spin` and a listed spin was rewarded
- **THEN** that row carries `spin.outcome` `reward` and `spin.reward` with the reward's transfer ID and objekt

#### Scenario: Reward row is still returned
- **WHEN** a client requests `GET /api/v1/transfers/{address}` and the page holds a spin and its reward
- **THEN** both rows are returned, the reward row carrying `rewardOf` equal to the spin row's transfer ID

#### Scenario: Document describes the fields
- **WHEN** a client reads either operation in `/api/v1/spec.json`
- **THEN** the item schema names the optional `spin` and `rewardOf` fields
