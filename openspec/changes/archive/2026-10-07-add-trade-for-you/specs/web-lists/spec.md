## ADDED Requirements

### Requirement: Trade matches shortcut
On their own have or want list, the owner SHALL see a Trade matches control in the list header, showing the number of mutual partners for that list once it is known. Activating it SHALL open `/trade/for-you?list=<slug>`. Other visitors SHALL not see the control.

#### Scenario: Owner opens matches
- **WHEN** the owner of have list "spares" activates Trade matches
- **THEN** the browser is at `/trade/for-you?list=spares` with that list selected in the list filter

#### Scenario: Visitor
- **WHEN** a signed-in user opens someone else's have list
- **THEN** no Trade matches control is shown
