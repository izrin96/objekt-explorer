# cosmo

This package is a copy from [teamreflex/cosmo-web/packages/cosmo](https://github.com/teamreflex/cosmo-web/tree/main/packages/cosmo).

## QR sign-in and sessions

`src/server/` also holds the calls that sign a user in to Cosmo with a QR code and read their own collections. Every one throws `CosmoSessionError` (`kind`: `refused`, `dead`, `unavailable`, `busy`, `unexpected`, plus `status`), which carries no URL, body or header, since ofetch's own message holds `?ticket=…`.

- `mintRecaptchaToken(browserUrl)` (`recaptcha.ts`) opens `https://shop.cosmo.fans` in the `browser` service over CDP and returns a reCAPTCHA v3 token; Cosmo refuses one minted on any other origin. The pure CDP framing is in `src/cdp.ts`.
- `createLoginTicket`, `readLoginTicket` and `certifyLoginTicket` (`qr-auth.ts`, on `cosmoShop`): the ticket lives 180 s and encodes `cosmo://ticket-login?t=<ticket>`; certify sends the 2-digit code as a number and returns the `user-session` cookie. Ticket and certify `POST`s are one-shot, never retried.
- `fetchSessionUser(cookie)` returns only `nickname` and `address`, `logoutSession(cookie)` signs out, and `fetchObjektSummaries(cookie, { artistId, page, size?, className? })` returns one page of the signer's collections with media fields and each `objekts[]` entry's `tokenId`, `objektNo`, `transferable`, reason, grid use, owner and status. No retry: the worker's budget decides when to try again.
- Parsing is in `src/session-parse.ts` (Zod): each collection and each objekt parses on its own, so one malformed item is skipped and counted, and every field not named above is dropped, including email and birth date.
- A 401 or 403 is `dead` only with Cosmo's JSON error body; any other 403 is `unavailable`, since Cosmo's firewall blocks some server IPs with an HTML page.
