# api-errors Specification

## Purpose
How `packages/api` reports a refused request, and how `apps/web` shows that refusal to the user in their own locale.

## Requirements

### Requirement: Refusals carry a reason code
Every refusal the web app can show SHALL carry a machine-readable reason code in its error data (`data.reason`), drawn from a fixed, published list of codes for its domain, alongside its HTTP status. A refusal that has a time after which the request may succeed SHALL also carry that time (`data.retryAt`).

#### Scenario: Linking two have lists
- **WHEN** a user links a have list to another have list
- **THEN** the request fails with status 400 and a reason code naming the mismatch, not only a sentence

#### Scenario: Rate-limited link code
- **WHEN** a user requests verification codes faster than the limit allows
- **THEN** the request fails with status 429 and a rate-limit reason code

### Requirement: English fallback message
Every refusal SHALL also carry a plain English `message`: a sentence describing the refusal, or at least the status's standard text. The message SHALL be the same whatever the caller's locale.

#### Scenario: API caller reads an error
- **WHEN** an `/api/v1` caller with a Korean locale requests a list entries page for an unknown list
- **THEN** the error body carries `defined`, `code`, `status` and an English `message`

#### Scenario: Tab opened before the deploy
- **WHEN** a tab loaded before this change shows a refusal it renders by its message
- **THEN** it shows the English message instead of failing

### Requirement: Refusals shown in the user's locale
The web app SHALL show every refusal from its reason code, in the user's locale (`en`, `ko` or `ja`), and SHALL NOT render the server's `message`. A reason code the web app does not recognise SHALL be shown as a generic, translated failure message.

#### Scenario: Korean user links mismatched lists
- **WHEN** a user browsing in Korean links a want list to a want list in the list form
- **THEN** the form shows the Korean message for that mismatch

#### Scenario: Unknown reason
- **WHEN** the server returns a reason code the loaded web app does not know
- **THEN** the screen shows the generic failure message in the user's locale

### Requirement: Recoverable refusals keep their branch
A refusal a screen recovers from (an expired verification code offering a new one, a provider link needing a fresh sign-in) SHALL keep the error code that screen already branches on, so a tab loaded before this change still takes the recovery path.

#### Scenario: Expired verification code
- **WHEN** a user on `/link/connect` verifies after the code expired
- **THEN** the verify step shows the expiry message in their locale and offers a new code, in a tab loaded before or after the deploy
