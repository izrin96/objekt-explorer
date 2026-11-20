## MODIFIED Requirements

### Requirement: Cosmo's text colour under staff overrides
A recorded text colour of 6 hex digits SHALL replace a collection's text colour when the collection has no staff text colour. A pinned staff colour and the source colour kept beside it SHALL NOT be changed. An unpinned staff text colour equal to the recorded one, ignoring letter case, SHALL be dropped: the collection SHALL show the recorded colour with no override. An unpinned staff background colour equal to the source's background, ignoring letter case and surrounding spaces, SHALL be dropped the same way, showing that colour as 6 lowercase hex digits after `#`. An unpinned staff colour that differs SHALL NOT be changed. Each drop SHALL write a collection history entry naming Cosmo, before the colour changes; a drop whose entry cannot be written SHALL change nothing. Background colours SHALL NOT be changed otherwise.

#### Scenario: No override
- **WHEN** a Unit collection's text colour is the class default #ffffff and a sync records #000000
- **THEN** its cards show #000000 text

#### Scenario: Pinned override
- **WHEN** ever01-seoyeon-338z has the pinned staff text colour #07328d over the source #7328D, and a sync records #1a1a1a
- **THEN** its cards still show #07328d with #7328D struck through beside it in the collections table

#### Scenario: Unpinned override equal to Cosmo's
- **WHEN** a collection has the unpinned staff text colour #f787bf and a sync records #F787BF
- **THEN** within 10 minutes its cards show #f787bf with no override, and the history names Cosmo for the change

#### Scenario: Unpinned override that differs
- **WHEN** cream02-jiwoo-373z has the unpinned staff text colour #000000 and a sync records #2d1f17
- **THEN** its cards still show #000000

#### Scenario: Background equal to the source
- **WHEN** cream02-jiwoo-372z has the unpinned staff background #e07b36 over the source "#E07B36 "
- **THEN** within 10 minutes its cards show the background #e07b36 with no override

#### Scenario: After a Reset
- **WHEN** an admin then resets ever01-seoyeon-338z's text colour
- **THEN** its cards show #1a1a1a on their next load
