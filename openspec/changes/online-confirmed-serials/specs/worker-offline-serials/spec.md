# Spec Delta

## ADDED Requirements

### Requirement: V1 serials are compared, never written from reads
A serial read for an objekt minted before the v1 cutoff SHALL NOT change any serial or anchor. Differences SHALL be counted for the operator. Online objekts minted after the cutoff are numbered as `worker-online-serials` describes.

#### Scenario: A v1 objekt
- **WHEN** a read shows a different serial for an objekt minted before the v1 cutoff
- **THEN** its serial is unchanged and the difference is counted

## REMOVED Requirements

### Requirement: Online and v1 serials are compared, never written from reads
**Reason**: Online objekts minted after the v1 cutoff drift from Cosmo's numbering, and connected accounts' reads now anchor them (`worker-online-serials`). Only v1 serials stay compare-only.
**Migration**: Replaced by "V1 serials are compared, never written from reads" here and by `worker-online-serials`. Archive `cosmo-objekt-ownership-data`, which adds the removed requirement, before this change.
