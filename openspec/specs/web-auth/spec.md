# web-auth Specification

## Purpose
Getting into and out of an account on `apps/web`: email and social sign-in, sign-up,
password reset by email, the verified-email landing, and where the user lands afterwards.

## Requirements

### Requirement: Email and social sign-in
`/login` SHALL offer sign-in by email and password and by Discord or Twitter, and SHALL
switch in place to a sign-up form (name, email, password) and a forgot-password form
(email) without leaving the page. Server errors SHALL be shown next to the form in the
current locale.

#### Scenario: Wrong password
- **WHEN** the user submits a valid email with a wrong password
- **THEN** the form shows the server's localised error and stays on the sign-in state

#### Scenario: Sign-up signs in
- **WHEN** the user submits a valid sign-up
- **THEN** a session exists and the nav shows the account avatar

### Requirement: Return to where the user was
After a successful sign-in or sign-up the app SHALL navigate to the `redirect` search
value when it is a same-origin path (starts with a single `/`), and to `/` otherwise.
A signed-in visitor opening `/login` SHALL be redirected to `/`.

#### Scenario: Redirect honoured
- **WHEN** a signed-out user reaches `/login?redirect=/market` and signs in
- **THEN** the URL is `/market`

#### Scenario: Unsafe redirect ignored
- **WHEN** the redirect value is `https://evil.example` or `//evil.example`
- **THEN** the app navigates to `/`

### Requirement: Password reset by email
The forgot-password form SHALL request a reset email for the address and return to the
sign-in state with a confirmation. `/auth/reset-password` SHALL require a `token` search
value, SHALL set the new password with it, and SHALL send the user to `/login` on success.

#### Scenario: Missing token
- **WHEN** `/auth/reset-password` is opened without `token`
- **THEN** the page shows the not-found surface

#### Scenario: Reset succeeds
- **WHEN** a valid token and a new password are submitted
- **THEN** the URL is `/login` and a success message is shown

### Requirement: Verified landing
`/auth/verified` SHALL confirm the email is verified and offer a Continue link to `/`.

#### Scenario: Continue
- **WHEN** the user follows Continue
- **THEN** the URL is `/`
