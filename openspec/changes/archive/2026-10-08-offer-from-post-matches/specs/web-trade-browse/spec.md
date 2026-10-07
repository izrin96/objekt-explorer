## MODIFIED Requirements

### Requirement: Make offer on a post
Each post that shows Message SHALL also offer Make offer. It opens the offer builder for the post's owner, with the post's have or sale list, if it has one, available on the You get side.

The builder SHALL lay out shortcuts from the post, each one tap to add, without pre-filling the offer:
- under You get, when the post has a have or sale side: its entries the viewer may ask for, those in collections on the viewer's want lists first, then the rest in list order;
- under You give, when the post has a want side (a WTB post, or the want list of a WTT pair): objekts the viewer holds that are transferable and not reserved, in collections on that want list, those on the viewer's have and sale lists bound to a Cosmo profile first.

Each shortcut SHALL show at most 8 objekts. An objekt added to the offer SHALL leave its shortcut, and the next one SHALL take its place. A shortcut with nothing to show SHALL not be rendered.

#### Scenario: From a WTT post
- **WHEN** a user activates Make offer on rin.trades's post
- **THEN** the builder opens addressed to rin.trades, listing that post's have entries under You get

#### Scenario: Matches first
- **WHEN** rin.trades's have list holds 20 entries and its 15th is SeoYeon 204Z, which is on the viewer's want list
- **THEN** SeoYeon 204Z is the first objekt under You get

#### Scenario: Refill
- **WHEN** the viewer adds an objekt from the You get shortcut of a post with 12 entries
- **THEN** that objekt leaves the shortcut and the 9th entry joins it, so it still shows 8

#### Scenario: WTB post
- **WHEN** a user activates Make offer on a WTB post wanting HaSeul 302Z, and holds a copy of it
- **THEN** that copy is shown under You give, and nothing is shown under You get from the post

#### Scenario: Nothing to give
- **WHEN** the viewer holds nothing the post's want list asks for
- **THEN** no shortcut is shown under You give
