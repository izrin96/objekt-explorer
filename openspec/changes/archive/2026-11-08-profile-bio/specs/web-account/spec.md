# Spec Delta

## MODIFIED Requirements

### Requirement: What deletion keeps
Deletion SHALL keep the account's record, renamed "Deleted account", so partners' history stays whole.

It SHALL remove:
- the email, username, avatar and linked social handles;
- the lists, notifications, and notification and message settings;
- the links to Cosmo profiles, and each linked profile's banner and bio.

It SHALL keep:
- trades and their legs, each with the wallet addresses as they were at accept;
- ratings given and received;
- reports filed by and against the account, sanctions and moderation entries;
- messages.

After deletion:
- partners SHALL see "Deleted account" wherever the account was named;
- a send to the deleted account SHALL be refused as a block is (see `web-chat`);
- every open offer the account sent or received SHALL be cancelled with the reason "an account in it was deleted", and the other party SHALL be notified;
- the email address SHALL be free for a new sign-up.

A wallet that was linked to the deleted account SHALL carry its unfinished trades to any account that links it once it may be linked again (see `web-cosmo-link`, and Reputation in `web-verified-trades`).

#### Scenario: Partner view
- **WHEN** rin.trades deletes the account after completing T-1042 with kaede.k
- **THEN** kaede.k's My trades still lists T-1042 with "Deleted account" as the partner, her rating of the trade stays, and the conversation keeps its messages but refuses a new one

#### Scenario: Open offer cancelled
- **WHEN** offer O-882 from rin.trades to kaede.k is open when rin.trades deletes the account
- **THEN** O-882 shows Cancelled with "an account in it was deleted", and kaede.k is notified

#### Scenario: Same wallet, new account
- **WHEN** rin.trades has 1 unfinished trade, deletes the account, and 7 days later links the same Cosmo wallet to a new account
- **THEN** the new account's line reads "No verified trades · 1 unfinished"

#### Scenario: Bio removed
- **WHEN** rin.trades, whose profile rin.t has a bio, deletes the account
- **THEN** rin.t keeps no bio, and an account that later links it starts with none
