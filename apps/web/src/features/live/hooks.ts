import { useCallStateHooks, useParticipantViewContext } from "@stream-io/video-react-sdk";
import { useCallback, useEffect, useRef, useState } from "react";

type WebkitVideo = HTMLVideoElement & {
  webkitPresentationMode?: "inline" | "fullscreen" | "picture-in-picture";
  webkitSetPresentationMode?: (mode: "inline") => void;
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
};

type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};

const FULLSCREEN_EVENTS = ["fullscreenchange", "webkitfullscreenchange"] as const;

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * iOS gives fullscreen to the `<video>` element rather than the document, and
 * reports it through `webkitpresentationmodechanged`, so the two paths cannot
 * share a single `requestFullscreen` call.
 */
export function useToggleFullScreen(): { isFullscreen: boolean; toggle: () => Promise<void> } {
  const { participantViewElement, videoElement } = useParticipantViewContext();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iosFullscreen = useRef(false);

  useEffect(() => {
    const doc = document as WebkitDocument;
    const onChange = () => {
      setIsFullscreen(Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement));
    };

    for (const event of FULLSCREEN_EVENTS) document.addEventListener(event, onChange);
    return () => {
      for (const event of FULLSCREEN_EVENTS) document.removeEventListener(event, onChange);
    };
  }, []);

  useEffect(() => {
    const video = videoElement as WebkitVideo | null;
    if (!video || !isIOS()) return;

    const onPresentationModeChange = () => {
      const mode = video.webkitPresentationMode;
      iosFullscreen.current = mode === "fullscreen";
      setIsFullscreen(mode === "fullscreen");
      // leaving the native player can leave the element paused
      if (mode === "inline" && video.paused) void video.play().catch(() => {});
    };

    video.addEventListener("webkitpresentationmodechanged", onPresentationModeChange);
    return () => {
      video.removeEventListener("webkitpresentationmodechanged", onPresentationModeChange);
    };
  }, [videoElement]);

  const toggle = useCallback(async () => {
    const video = videoElement as WebkitVideo | null;
    const doc = document as WebkitDocument;

    if (isFullscreen || iosFullscreen.current) {
      if (isIOS() && video?.webkitExitFullscreen) {
        video.webkitExitFullscreen();
        return;
      }
      if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
      else await document.exitFullscreen();
      setIsFullscreen(false);
      return;
    }

    if (isIOS() && video?.webkitEnterFullscreen) {
      if (video.webkitPresentationMode === "picture-in-picture") {
        video.webkitSetPresentationMode?.("inline");
      }
      if (video.paused) await video.play().catch(() => {});
      video.webkitEnterFullscreen();
      iosFullscreen.current = true;
      setIsFullscreen(true);
      return;
    }

    await participantViewElement?.requestFullscreen();
    setIsFullscreen(true);
  }, [isFullscreen, participantViewElement, videoElement]);

  return { isFullscreen, toggle };
}

export function useCallDuration(): number {
  const { useIsCallLive, useCallSession } = useCallStateHooks();
  const isCallLive = useIsCallLive();
  const session = useCallSession();
  const startedAt = session?.live_started_at;
  const [duration, setDuration] = useState(() => elapsedSeconds(startedAt));

  useEffect(() => {
    if (!isCallLive) return;
    // read the clock rather than incrementing, so a backgrounded tab catches up
    const id = setInterval(() => setDuration(elapsedSeconds(startedAt)), 1000);
    return () => clearInterval(id);
  }, [isCallLive, startedAt]);

  return duration;
}

function elapsedSeconds(startedAt: string | undefined): number {
  if (!startedAt) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
}
