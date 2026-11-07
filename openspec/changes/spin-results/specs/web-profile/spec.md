# Spec Delta

## ADDED Requirements

### Requirement: Spin outcomes in Activity history
The Activity history tab SHALL show each spin's outcome in its spin rows and, in the All view, fold a spin's reward into its spin row, as `web-spin-results` describes, in either sort order and at a checkpoint. A reward minted after the checkpoint date SHALL still show, since the outcome belongs to the spin.

#### Scenario: Oldest first
- **WHEN** the tab is sorted oldest first and holds a spin and its reward
- **THEN** one row shows the spin and its reward

#### Scenario: Checkpoint just after a spin
- **WHEN** the checkpoint date ends between a spin and its reward
- **THEN** the spin row shows the reward, while the reward's own mint row is not listed
