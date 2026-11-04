## ADDED Requirements

### Requirement: Edit list in the composer
Each picked side of the preview SHALL offer Edit list beside its list's name, opening the list page's edit form for that list, with no Trade line (see `web-lists` Trade line in the list form). Saving SHALL apply to the list at once and keep the composer's picks; a rename SHALL show in the preview and the side's dropdown, and leaving the composer SHALL keep the edit. A refused save SHALL say why and keep the form's input. Closing the form SHALL return focus to Edit list.

#### Scenario: Rename while posting
- **WHEN** the viewer picks Swap with have list "spares" and want list "binary hunt", activates Edit list on the Has side and saves the name "spares 2"
- **THEN** the form closes, the Has side and its dropdown read "spares 2", and Swap, both lists and the options are as before

#### Scenario: No Trade line
- **WHEN** the viewer activates Edit list on want list "binary hunt", which is in their Swap post
- **THEN** the form shows no Trade line and offers neither Edit post nor Post it

#### Scenario: Leave without posting
- **WHEN** the viewer changes the description of "binary hunt" through Edit list, then leaves without posting
- **THEN** "binary hunt" keeps the new description, and its Trade state is as before

#### Scenario: Cancel
- **WHEN** the viewer opens Edit list on "spares" and cancels the form
- **THEN** "spares" is unchanged, the picks are as before, and focus is back on Edit list
