/**
 * Which control opened the offer page, so it takes focus again when Back or Cancel lands on its
 * page: a Make offer link by its href, chat's Add to message by `chat-add:<id>`. In memory only;
 * a reload forgets it, and a sent offer forgets it.
 */
let opener: string | null = null;
let armed = false;

export function rememberOpener(key: string) {
  opener = key;
  armed = false;
}

/** The page is being left by Back or Cancel. */
export function armReturn() {
  armed = true;
}

/**
 * The leave was called off (Keep editing), or the page it landed on has drawn without the
 * opener: a row that mounts later must not take focus. The opener stays for the next Back.
 */
export function disarmReturn() {
  armed = false;
}

export function forgetOpener() {
  opener = null;
  armed = false;
}

/** Whether `key` opened the page just left; true once. */
export function takeReturn(key: string) {
  if (!armed || opener !== key) return false;
  forgetOpener();
  return true;
}
