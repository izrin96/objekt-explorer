import { useCallStateHooks, useParticipantViewContext } from "@stream-io/video-react-sdk";
import { useCallback, useEffect, useRef, useState } from "react";

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

export const useToggleFullScreen = () => {
  const { participantViewElement, videoElement } = useParticipantViewContext();
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Track whether iOS native player is active
  const iosFullscreenActive = useRef(false);

  console.log(isFullscreen);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isInFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isInFullscreen);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  // Listen for iOS native player exit — fires when user taps "Done"
  useEffect(() => {
    const vid = videoElement as any;
    if (!vid || !isIOS()) return;

    const handleWebkitEndFullscreen = () => {
      iosFullscreenActive.current = false;
      setIsFullscreen(false);

      // Re-attach the video stream after iOS tears it down
      // Small delay lets the iOS player fully dismiss first
      setTimeout(() => {
        if (vid.paused) {
          vid.play().catch(() => {
            // Stream SDK will handle reconnect if play() fails
          });
        }
      }, 300);
    };

    vid.addEventListener("webkitendfullscreen", handleWebkitEndFullscreen);
    return () => {
      vid.removeEventListener("webkitendfullscreen", handleWebkitEndFullscreen);
    };
  }, [videoElement]);

  return useCallback(async () => {
    // --- EXIT ---
    if (isFullscreen || iosFullscreenActive.current) {
      // iOS: video element owns fullscreen, not document
      const vid = videoElement as any;
      if (isIOS() && vid?.webkitExitFullscreen) {
        vid.webkitExitFullscreen();
        // Don't set state here — let webkitendfullscreen handle it
        return;
      }
      if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      } else {
        await document.exitFullscreen();
      }
      setIsFullscreen(false);
      return;
    }

    // --- ENTER ---
    const vid = videoElement as any;
    if (isIOS() && vid?.webkitEnterFullscreen) {
      // Ensure video is playing before entering — iOS requires it
      if (vid.paused) {
        await vid.play().catch(() => {});
      }
      vid.webkitEnterFullscreen();
      iosFullscreenActive.current = true;
      setIsFullscreen(true);
      return;
    }

    const el = participantViewElement as any;
    if (el?.mozRequestFullScreen) {
      el.mozRequestFullScreen();
    } else if (el?.msRequestFullscreen) {
      el.msRequestFullscreen();
    } else {
      await participantViewElement?.requestFullscreen();
    }
    setIsFullscreen(true);
  }, [isFullscreen, participantViewElement, videoElement]);
};

export const useUpdateCallDuration = () => {
  const { useIsCallLive, useCallSession } = useCallStateHooks();
  const isCallLive = useIsCallLive();
  const session = useCallSession();
  const [duration, setDuration] = useState(() => {
    if (!session || !session.live_started_at) return 0;
    const liveStartTime = new Date(session.live_started_at);
    const now = new Date();
    return Math.floor((now.getTime() - liveStartTime.getTime()) / 1000);
  });

  useEffect(() => {
    if (!isCallLive) return;
    const interval = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [isCallLive]);

  return duration;
};
