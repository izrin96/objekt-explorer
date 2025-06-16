"use client";

import { useParticipantViewContext } from "@stream-io/video-react-sdk";
import { useCallback, useEffect, useState } from "react";

export const useToggleFullScreen = () => {
  const { participantViewElement, videoElement } = useParticipantViewContext();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      // Check standard, webkit, and moz fullscreen
      const isInFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isInFullscreen);
    };

    // Listen for all fullscreen changes
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "mozfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "MSFullscreenChange",
        handleFullscreenChange
      );
    };
  }, []);

  return useCallback(() => {
    if (isFullscreen) {
      // Handle iOS Safari exit
      if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
        setIsFullscreen(false);
        return;
      }
      // Handle Firefox exit
      if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
        setIsFullscreen(false);
        return;
      }
      // Handle Microsoft exit
      if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
        setIsFullscreen(false);
        return;
      }
      // Handle other browsers exit
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    } else {
      // Handle iOS Safari enter
      if ((videoElement as any)?.webkitEnterFullscreen) {
        (videoElement as any).webkitEnterFullscreen();
        setIsFullscreen(true);
        return;
      }
      // Handle Firefox enter
      if ((participantViewElement as any)?.mozRequestFullScreen) {
        (participantViewElement as any).mozRequestFullScreen();
        setIsFullscreen(true);
        return;
      }
      // Handle Microsoft enter
      if ((participantViewElement as any)?.msRequestFullscreen) {
        (participantViewElement as any).msRequestFullscreen();
        setIsFullscreen(true);
        return;
      }
      // Handle other browsers enter
      participantViewElement?.requestFullscreen().then(() => {
        setIsFullscreen(true);
      });
    }
  }, [isFullscreen, participantViewElement, videoElement]);
};
