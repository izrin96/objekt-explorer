# web-app-shell Specification

## Purpose
The `apps/web` document shell: how the page frame, theme, layout width, locale and router
fallback surfaces behave before any feature is rendered inside them.

## Requirements

### Requirement: Theme is applied before first paint and follows the setting
The app SHALL persist a theme setting of `System`, `Light` or `Dark` per browser and SHALL
apply it to the document before the first paint, so a server-rendered page never flashes
the wrong theme. Under `System` the app SHALL follow the operating-system preference and
SHALL update live when that preference changes.

#### Scenario: Dark setting survives a hard reload
- **WHEN** the theme setting is `Dark` and the user hard-reloads any page
- **THEN** the first painted frame already uses the dark palette

#### Scenario: System setting tracks the OS
- **WHEN** the theme setting is `System` and the operating system switches from light to dark
- **THEN** the page switches to the dark palette without a reload

### Requirement: Wide layout setting removes the container cap
The app SHALL persist a `wide` layout setting per browser. When it is on, the content
container SHALL span the full viewport width; when off, it SHALL be capped at the 2xl
breakpoint width and centred. The setting SHALL be applied before first paint.

#### Scenario: Wide on
- **WHEN** `wide` is on and a page is loaded at a 1920 px viewport
- **THEN** the main content box is the full viewport width minus its side padding

#### Scenario: Wide off
- **WHEN** `wide` is off at the same viewport
- **THEN** the main content box is centred and no wider than the 2xl breakpoint

### Requirement: Locale comes from the locale cookie with English fallback
The document SHALL declare its language from the `PARAGLIDE_LOCALE` cookie when it holds one
of `en`, `ko`, `ja`, and `en` otherwise. Every user-facing string in the shell SHALL be
served in that locale.

#### Scenario: Korean cookie
- **WHEN** a request carries `PARAGLIDE_LOCALE=ko`
- **THEN** the document's `lang` attribute is `ko` and the not-found page text is Korean

#### Scenario: No cookie
- **WHEN** a request carries no locale cookie
- **THEN** the document's `lang` attribute is `en`

### Requirement: Unknown paths and failures render the shell's fallback surfaces
The app SHALL render a not-found surface inside the shell for any path that matches no
route, and an error surface inside the shell when a route throws. Both SHALL offer a way
back to the home page. A pending surface SHALL be shown while a route's data is loading.

#### Scenario: Unknown path
- **WHEN** the user opens `/this-does-not-exist`
- **THEN** the response status is 404 and the page shows the not-found surface with the nav
  frame and a link to `/`

#### Scenario: Route error
- **WHEN** a route component throws during render
- **THEN** the page shows the error surface inside the shell instead of a blank document

### Requirement: No horizontal page scroll
No page in the shell SHALL be horizontally scrollable at any viewport width from 360 px up;
content wider than the viewport SHALL be clipped at the document, and each deliberate
horizontal scroller SHALL be marked as such.

#### Scenario: Narrow viewport
- **WHEN** the home page is opened at a 360 px viewport
- **THEN** the document has no horizontal scrollbar and the dev overflow guard reports nothing
