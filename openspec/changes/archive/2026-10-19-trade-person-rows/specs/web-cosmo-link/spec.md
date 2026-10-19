# Spec Delta

## MODIFIED Requirements

### Requirement: Hide Cosmo ID
A profile's Hide Cosmo ID setting SHALL hide its Cosmo nickname in Activity, Activity History, Serial Lookup, Holders, list pages and the profile itself (its page and its hover card, wherever the card opens), showing the address instead. Everywhere else, including Trade (Browse, For you, Find trade partners, hidden partners), want alerts, Market and Messages, the profile SHALL be named by its nickname whatever the setting, the same as a profile without it. The setting's description SHALL name where it applies.

#### Scenario: Hidden on the profile, shown on Trade
- **WHEN** rinrin turns on Hide Cosmo ID and posts a list bound to that profile
- **THEN** rinrin's profile header and Activity rows show the address, and the Trade post is headed "rinrin"
