# Spec Delta

## ADDED Requirements

### Requirement: Drawer card plays motion
When a collection's media copy is a video (MP4 or WebM), the drawer's card SHALL play the site's own copy of it, never Cosmo's, muted and looping in place of the front image, with the band drawn over it as over the image, starting from the front image until the video loads. A viewer who prefers reduced motion SHALL see the front image, not the video. Cards in grids SHALL keep the still image. A media copy that is audio (M4A, MP3 or Ogg) SHALL never play on the card.

#### Scenario: Motion collection
- **WHEN** a viewer opens the drawer of a collection with a motion video
- **THEN** the card plays the video from the site's storage, muted and looping, with the band over it

#### Scenario: Reduced motion
- **WHEN** a viewer who prefers reduced motion opens the same drawer
- **THEN** the card shows the front image and no video plays

#### Scenario: Grid
- **WHEN** the same collection shows in the collection grid
- **THEN** its card is the still image

### Requirement: Motion and voice in Metadata
The drawer's Metadata tab SHALL show a Motion row linking to the site's copy of the media when that copy is a video, and a Voice row. When the copy is audio, the Voice row SHALL link to it and no Motion row SHALL show; otherwise the Voice row SHALL read Yes or No.

#### Scenario: Voice objekt
- **WHEN** a viewer opens Metadata for a collection with a voice and a motion video
- **THEN** it shows Motion as a link to the video and Voice: Yes

#### Scenario: Audio voice
- **WHEN** a viewer opens the drawer of a voice collection whose media copy is an MP3
- **THEN** the card shows the front image, Metadata shows no Motion row, and the Voice row links to the audio

#### Scenario: No motion
- **WHEN** a viewer opens Metadata for a collection without a motion video or voice
- **THEN** it shows no Motion link and Voice: No
