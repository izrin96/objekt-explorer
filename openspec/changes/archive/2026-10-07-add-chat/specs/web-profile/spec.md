## ADDED Requirements

### Requirement: Message from a profile
A profile whose address is linked to an account other than the viewer's SHALL offer Message in its header, under the rules in `web-chat`, including the hidden-owner opt-in when the profile hides its owner. A conversation started here carries no card, so it lands in the recipient's Requests. A profile with no linked account, and the viewer's own profile, SHALL show no Message.

#### Scenario: Unlinked address
- **WHEN** a visitor opens the profile of an address no account has linked
- **THEN** the header shows no Message action
