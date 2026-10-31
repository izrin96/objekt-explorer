# Spec Delta

## ADDED Requirements

### Requirement: List URL in the edit form
The edit form of a list filed under a Cosmo profile SHALL show its profile-scoped URL with a Regenerate URL from new name choice. Unticked, the field SHALL show the current profile slug. Ticked, it SHALL show the slug the server would give the typed name now, `-<counter>` suffix included, following the name as it is typed. Until the first answer, or when the server cannot answer, it SHALL say the URL will be made from the name on save.

#### Scenario: Current URL
- **WHEN** the owner opens the edit dialog of list "Spares" filed under profile "izrin96" with profile slug `spares`
- **THEN** the List URL field reads `/@izrin96/list/` followed by `spares`

#### Scenario: Regenerate ticked
- **WHEN** the owner renames the list "Binary spares" and ticks Regenerate URL from new name
- **THEN** the List URL field shows `binary-spares`

#### Scenario: A taken slug
- **WHEN** another of that profile's lists holds `binary-spares`, and the owner renames the list "Binary spares" with Regenerate URL from new name ticked
- **THEN** the List URL field shows `binary-spares-2`

#### Scenario: Typing
- **WHEN** Regenerate URL from new name is ticked and the owner changes the name to "Binary trade"
- **THEN** the field keeps its last slug while the owner types, then shows `binary-trade`

#### Scenario: Before the first answer or on failure
- **WHEN** the owner ticks Regenerate URL from new name and the server has not answered yet, or refuses or fails
- **THEN** the List URL field shows no slug and says the URL will be made from the name when the list is saved

#### Scenario: A name with no letters the slug keeps
- **WHEN** the owner renames the list "!!!" with Regenerate URL from new name ticked
- **THEN** the List URL field shows the list's plain list slug, and saving gives it that slug

#### Scenario: Unticking
- **WHEN** the owner ticks Regenerate URL from new name and unticks it again
- **THEN** the List URL field shows the current profile slug again, and saving keeps it

### Requirement: Slug preview is the owner's
The server SHALL answer a slug preview only for the caller's own list filed under a profile, SHALL write nothing for it, and SHALL limit how often one user asks.

#### Scenario: Another user's list
- **WHEN** a signed-in user asks for a slug preview of a list they do not own
- **THEN** the server answers not found and reveals no slug

#### Scenario: Asking too often
- **WHEN** one user asks for more previews in a minute than the limit allows
- **THEN** the server refuses with the rate-limit refusal, and the field says the URL will be made from the name on save
