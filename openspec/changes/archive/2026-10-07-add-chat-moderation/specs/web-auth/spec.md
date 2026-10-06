## ADDED Requirements

### Requirement: Banned accounts
A banned account SHALL be signed out everywhere when the ban is applied. Signing in SHALL be refused with a message giving the ban's reason and its end date, or saying it has no end. When a ban's end date passes, the account SHALL be able to sign in again.

#### Scenario: Sign in while banned
- **WHEN** a user banned until Nov 1 for "scam reports" tries to sign in
- **THEN** sign-in is refused with "Your account is banned until Nov 1: scam reports"
