# web-cosmo-session Specification

## Purpose
Letting any signed-in user connect their own Cosmo account by Cosmo's QR sign-in, so the server holds that account's session to read the collection data the public metadata lacks and share it site-wide, and keeping, using and ending that session safely on the user's behalf.

## Requirements

### Requirement: Users handle only their own Cosmo sessions
Any signed-in user SHALL be able to start a QR sign-in, check it, enter its code, list their sessions, ask for a sync and disconnect. Each action SHALL apply only to the caller's own sessions: a session id that belongs to another user SHALL be refused as not found, exactly as an id that does not exist. A signed-out request SHALL be refused, with nothing started or changed.

#### Scenario: Signed out
- **WHEN** a signed-out visitor sends a request to start a QR sign-in
- **THEN** it is refused, and no browser page is opened and no Cosmo request is sent

#### Scenario: Another user's session
- **WHEN** kaede.k asks for a sync, or disconnects, naming the id of rin.trades's session
- **THEN** it is refused as not found, and rin.trades's session is unchanged

#### Scenario: Own list only
- **WHEN** rin.trades and kaede.k have each connected a Cosmo account and rin.trades opens the section
- **THEN** only rin.trades's own account is listed

### Requirement: Collection data section says what is shared
The Collection data section SHALL show, above Connect a Cosmo account and before any sign-in, what the site stores (an encrypted Cosmo sign-in kept until disconnected and 180 days at most, and the Cosmo nickname and wallet address), what it reads (the held collections' media and colours, keeping nothing else), what others see (the media, not linked to the user) and how to stop (Disconnect, or deleting the account).

#### Scenario: Before connecting
- **WHEN** a signed-in user with no connected account opens `/account/collection-data`
- **THEN** the section shows what is stored, read and shown and how to stop, then Connect a Cosmo account, and says no Cosmo account is connected

#### Scenario: Not set up
- **WHEN** the server has no session key configured
- **THEN** the section says Cosmo sign-in is not set up, and Connect a Cosmo account is unavailable

### Requirement: Connected account list
The section SHALL list one row per Cosmo account the user connected: its nickname and address, when it was connected, when it last synced with how many collections it read, recorded, applied and skipped, when a live session expires, its last failure if any, and whether it is live or signed out. A live row SHALL offer Sync now and Disconnect, and Renew in its last 14 days (see Renew before expiry); a signed-out row SHALL offer Reconnect and Disconnect.

#### Scenario: Live row
- **WHEN** rin.trades connected the Cosmo account rin.t, which synced an hour ago reading 178 collections
- **THEN** its row shows rin.t, its address, the connect date, "1 hour ago" with 178 read, the date it expires, and Sync now and Disconnect, with no Renew

### Requirement: Renew before expiry
While a live session has fewer than 14 days left, its row SHALL say how many whole days remain ("Expires in N days", "Expires in 1 day" or "Expires today") and offer Renew, which SHALL open the same connect dialog as Connect a Cosmo account. Signing in there as the same Cosmo account SHALL keep one row for it, live, and restart its 180 days from that sign-in. Signing in as another account SHALL connect that account as Connect does, under the same limit of 3.

#### Scenario: Nine days left
- **WHEN** rin.t's session expires in 9 days and 6 hours and rin.trades opens the section
- **THEN** rin.t's row reads "Expires in 9 days" and offers Renew beside Sync now and Disconnect

#### Scenario: Last day
- **WHEN** rin.t's session expires in 20 hours
- **THEN** its row reads "Expires today"

#### Scenario: Renewed
- **WHEN** rin.trades presses Renew on rin.t, scans the code as rin.t and enters the code
- **THEN** the list still holds one rin.t row, live, connected today, expiring 180 days from today, with no "Expires in" line and no Renew

#### Scenario: Renew scanned with another account
- **WHEN** rin.trades presses Renew on rin.t but scans the code as rin.second, holding 2 connected accounts
- **THEN** rin.second is connected as a third row, and rin.t keeps its old expiry and its Renew

### Requirement: Sync now
Sync now SHALL ask for a sync of that session, show that one is pending until the row's sync time changes, then show the new result without a reload. Sync now on a signed-out session SHALL be refused. A user SHALL be limited to 3 Sync now requests an hour.

#### Scenario: Pending then done
- **WHEN** rin.trades presses Sync now on rin.t
- **THEN** the row shows a sync is pending, and once the sync finishes it shows the new time and counts without a reload

#### Scenario: Signed out
- **WHEN** a Sync now request names a signed-out session
- **THEN** it is refused, and the row offers Reconnect

#### Scenario: Fourth in an hour
- **WHEN** rin.trades presses Sync now a fourth time within one hour
- **THEN** it is refused as too many requests and no sync is asked for

### Requirement: QR code from Cosmo
Connect SHALL ask Cosmo for a sign-in ticket and show it as a QR code that opens Cosmo's ticket sign-in, with a countdown to the ticket's expiry as Cosmo gives it, and a link that opens the same sign-in in the Cosmo app. While the code is being fetched, the dialog SHALL say so. Starting again SHALL replace the user's earlier ticket.

#### Scenario: Code shown
- **WHEN** a user presses Connect a Cosmo account and Cosmo issues a ticket valid for 180 seconds
- **THEN** the dialog shows a QR code, "Scan with the Cosmo app", and a countdown starting at 3:00

#### Scenario: Code expires unscanned
- **WHEN** the countdown reaches 0:00 before the code is scanned
- **THEN** the dialog says the code expired and offers Get a new code, and checking the old ticket stops

### Requirement: Two-digit code step
After the QR code is scanned in the Cosmo app, the dialog SHALL say which Cosmo account is signing in, with its own countdown to the code's expiry, and ask for the 2-digit code the app shows. Only digits SHALL be accepted, and a code of fewer than 2 digits SHALL NOT be sent.

#### Scenario: Scanned
- **WHEN** rin.t scans the code in the Cosmo app
- **THEN** the dialog reads "Signing in as rin.t", shows a code field and a countdown of about one minute

#### Scenario: Letters typed
- **WHEN** the user types "4a" in the code field
- **THEN** the field holds "4" and nothing is sent

### Requirement: Sign-in outcome
A correct code SHALL connect the account and show its Cosmo nickname. A code Cosmo rejects while time remains SHALL say the code did not match and keep the field for another try, up to the third wrong code of one ticket, which SHALL end the attempt as expired. A code sent after the code time ran out SHALL say the sign-in expired and offer Get a new code. A Cosmo failure SHALL say Cosmo could not complete the sign-in and offer Try again, storing nothing.

#### Scenario: Connected
- **WHEN** the user enters the code the app shows for rin.t
- **THEN** the dialog says rin.t is connected, and rin.t appears in the user's list

#### Scenario: Wrong code
- **WHEN** the user enters 47 and Cosmo rejects it with 30 seconds of code time left
- **THEN** the dialog says the code did not match, the field is cleared for another try, and nothing is stored

#### Scenario: Third wrong code ends the attempt
- **WHEN** the user enters a third wrong code for one ticket while code time remains
- **THEN** the dialog says the sign-in expired and offers Get a new code, the ticket is deleted, and no further code is sent for it

#### Scenario: Cosmo fails
- **WHEN** Cosmo answers the code with a server error
- **THEN** the dialog says Cosmo could not complete the sign-in, offers Try again, and no session is stored

### Requirement: Unknown sign-in state ends the attempt
When Cosmo reports a sign-in state other than waiting to scan, waiting for the code, or signed in, or says the ticket is unknown, the attempt SHALL be treated as expired.

#### Scenario: Unexpected status
- **WHEN** a ticket check returns a status the site does not know
- **THEN** the dialog says the code expired and offers Get a new code

### Requirement: Sign-in unavailable
When the server cannot get a code from Cosmo (its browser is down, busy or not set up, Cosmo refuses the request, or the ticket store is unreachable), Connect SHALL say a code could not be fetched and to try again, and SHALL send no request to Cosmo after the failure.

#### Scenario: Ticket store down
- **WHEN** a user presses Connect a Cosmo account while the server's Redis is unreachable
- **THEN** the dialog says a code could not be fetched, and no browser page is opened and no ticket is requested

#### Scenario: Cosmo refuses the browser's token
- **WHEN** Cosmo refuses the ticket request as an invalid reCAPTCHA
- **THEN** the dialog says a code could not be fetched and offers Try again

#### Scenario: Browser busy
- **WHEN** the server's browser already has its pages running and its queue full
- **THEN** the dialog says many people are connecting and to try again in a minute, and no ticket is requested

### Requirement: Sign-in limits
Each user SHALL be limited to 2 code requests a minute and 10 a day, and 10 code entries a minute; each network address to 5 code requests in 10 minutes; and the site to 10 code requests and 30 code entries a minute across users. Over a limit, the request SHALL be refused with the shared too-many-requests message, sending nothing to Cosmo.

#### Scenario: Third code in a minute
- **WHEN** a user asks for a third code within one minute
- **THEN** it is refused as too many requests and no browser page is opened

#### Scenario: Site-wide limit
- **WHEN** 10 codes were requested across all users in the last minute and another user asks for one
- **THEN** it is refused as too many requests and no browser page is opened

### Requirement: Sign-in checks under load
A user's sign-in checks SHALL be limited to 30 a minute. When the site has made 120 checks with Cosmo in the last minute, a further check SHALL answer with the last state the server saw for that ticket, without asking Cosmo, rather than refusing.

#### Scenario: Busy minute
- **WHEN** the site made 120 checks in the last minute and a user's dialog checks again
- **THEN** the dialog keeps showing the last state, no request is sent to Cosmo, and a later check asks Cosmo again

### Requirement: The server checks only its own ticket
Checking a sign-in and entering its code SHALL act on the ticket the server issued to that user, and SHALL take no ticket from the request.

#### Scenario: Ticket in the request
- **WHEN** a request to enter a code carries a ticket field naming another ticket
- **THEN** the field is ignored, and the code is sent for the user's own ticket or refused as expired when there is none

### Requirement: Up to three Cosmo accounts per user
A user SHALL hold at most 3 connected Cosmo accounts, live or signed out. Connecting a fourth SHALL be refused with a message saying to disconnect one first, and the new sign-in SHALL be signed out at Cosmo. Reconnecting one of the 3 SHALL always be allowed.

#### Scenario: Fourth account
- **WHEN** rin.trades has 3 connected accounts and completes a sign-in for a fourth
- **THEN** the dialog says to disconnect one first, nothing is stored, and the new sign-in is signed out at Cosmo

#### Scenario: Reconnect at the limit
- **WHEN** rin.trades has 3 connected accounts, one signed out, and reconnects that one
- **THEN** it is connected and the list still has 3 rows

### Requirement: One session per Cosmo account
The site SHALL hold at most one session per Cosmo account. Connecting an account that already has one SHALL replace it, whichever user held it, and sign the old one out at Cosmo. The user who held it SHALL see the account leave their list and SHALL NOT be shown who connected it.

#### Scenario: Reconnect
- **WHEN** rin.trades connects rin.t, which already has a session of theirs marked signed out
- **THEN** the list shows one rin.t row, live, and the old session is signed out at Cosmo

#### Scenario: Another user connects the same Cosmo account
- **WHEN** kaede.k connected rin.t last month, and rin.trades now signs in as rin.t in the Cosmo app and connects it
- **THEN** rin.t is listed for rin.trades only, kaede.k's list no longer shows it with no name of who took it, and kaede.k's session is signed out at Cosmo

### Requirement: Not tied to linked profiles
Connecting a Cosmo account SHALL NOT require, create or change a link between a Cosmo profile and the site account. Linking, unlinking or moving a profile SHALL NOT change a connected session. A connected account's nickname and address SHALL be shown only to its owner in the Collection data section, never on a profile, to staff or through the public API.

#### Scenario: No linked profile
- **WHEN** a user with no linked Cosmo profile connects rin.t
- **THEN** rin.t is connected, and the user's profiles section still lists no profile

#### Scenario: Unlinking a profile
- **WHEN** a user unlinks the profile at the same address as their connected rin.t
- **THEN** rin.t stays connected and live

### Requirement: Stored session is encrypted and minimal
A session SHALL be stored encrypted with a key used for nothing else, together with its owner, the Cosmo account's nickname and address, when it was connected and last used, and its last error code. No other personal data Cosmo returns (email, birth date, country and the like) SHALL be stored or logged, and no record SHALL say which user or session shared a collection's media.

#### Scenario: Stored row
- **WHEN** rin.trades connects rin.t
- **THEN** the stored row holds the encrypted session, rin.trades as owner, rin.t's nickname and address and the time, and no Cosmo user id, email or birth date

#### Scenario: Wrong key
- **WHEN** the session key changes after rin.t was connected
- **THEN** rin.t's session is not sent to Cosmo and not marked signed out, its row says to reconnect, other users' sessions still sync, and the server logs a warning

### Requirement: Session never leaves the server
A session cookie, a 2-digit code and a reCAPTCHA token SHALL NOT appear in any response, log line or error report. A ticket SHALL reach only the user who started that sign-in, inside the QR code and its link, and SHALL NOT appear in any log line or error report.

#### Scenario: Blocked rather than signed out
- **WHEN** a call with rin.t's session gets a forbidden answer that is not Cosmo's own error (a firewall page)
- **THEN** rin.t stays live, and its row shows that Cosmo was unavailable

#### Scenario: Cosmo error during sync
- **WHEN** a sync request to Cosmo fails and the failure is reported
- **THEN** the report carries no session cookie, ticket or request URL

### Requirement: Disconnect
Disconnect SHALL ask for confirmation, then delete the stored session and ask Cosmo to sign it out. When Cosmo does not confirm the sign-out, the section SHALL say so, and the session SHALL still be deleted from the site.

#### Scenario: Disconnect
- **WHEN** rin.trades confirms Disconnect on rin.t
- **THEN** the row leaves the list and the session no longer works at Cosmo

#### Scenario: Cosmo unreachable
- **WHEN** rin.trades confirms Disconnect while Cosmo does not answer
- **THEN** the row leaves the list and the section says Cosmo did not confirm the sign-out

### Requirement: Signed-out session
A session Cosmo refuses with its own error SHALL be marked signed out, its stored sign-in SHALL be erased, it SHALL NOT be sent to Cosmo again, and it SHALL be shown with Reconnect. A signed-out row SHALL be deleted 30 days after it was signed out, unless reconnected.

#### Scenario: Ended at Cosmo
- **WHEN** Cosmo ends the site's session and the next sync is refused
- **THEN** rin.t's row shows signed out with Reconnect, its stored sign-in is erased, and later syncs skip it

#### Scenario: Signed out for 30 days
- **WHEN** rin.t has been signed out for 31 days and was not reconnected
- **THEN** rin.t is no longer listed and the site holds no row for it

### Requirement: Sessions expire after 180 days
A session SHALL end 180 days after it was last connected or renewed, or earlier when Cosmo's own expiry comes first. Within 3 days after that, the site SHALL ask Cosmo to sign it out, erase it, and show the row as signed out with Reconnect.

#### Scenario: 180 days
- **WHEN** rin.t was connected 181 days ago and never reconnected
- **THEN** its row shows signed out with Reconnect, the session no longer works at Cosmo, and the site holds no sign-in for it

### Requirement: Sessions end with the account
Deleting a user's account, or banning it, SHALL delete that user's sessions and ask Cosmo to sign them out. A banned user SHALL NOT be able to connect until the ban ends, including a sign-in completed while the ban is applied. A trade block, chat mute or warning SHALL NOT affect a session.

#### Scenario: Account deleted
- **WHEN** rin.trades, who connected rin.t, deletes their account
- **THEN** rin.t's session is deleted from the site and signed out at Cosmo

#### Scenario: Banned
- **WHEN** a moderator bans rin.trades
- **THEN** rin.t's session is deleted from the site and signed out at Cosmo

#### Scenario: Ban during sign-in
- **WHEN** rin.trades enters the code just as a ban on rin.trades is applied
- **THEN** no session is stored, and the new sign-in is signed out at Cosmo

#### Scenario: Trade block
- **WHEN** a moderator blocks rin.trades from trading
- **THEN** rin.t stays connected and keeps syncing
