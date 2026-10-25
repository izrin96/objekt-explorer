# Spec Delta

## MODIFIED Requirements

### Requirement: Other profiles in a thread
A conversation SHALL be between two accounts, headed by the other account's default profile (see `web-cosmo-link`). When that account has other linked profiles, the thread header SHALL name them after the default ("rin.main · also rin.alt"). When the user opened the conversation from a profile that is not the account's default, an empty thread SHALL say once that this profile belongs to the account it is headed by.

#### Scenario: Other profiles in the header
- **WHEN** the user opens a conversation with an account whose default is "rin.main" and which also links "rin.alt"
- **THEN** the thread header reads "rin.main · also rin.alt"

#### Scenario: Started from an alt profile
- **WHEN** the user presses Message on "rin.alt"'s profile, whose account's default is "rin.main", and has never messaged that account
- **THEN** the thread is headed "rin.main" and the empty thread says "rin.alt is one of rin.main's profiles"

#### Scenario: Existing conversation
- **WHEN** the user presses Message on "rin.alt"'s profile and already has a conversation with that account
- **THEN** that conversation opens, history included, headed "rin.main"

#### Scenario: Private profile
- **WHEN** the other account also links a profile that was private before this change
- **THEN** the header names it with their other profiles
