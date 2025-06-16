"use client";

import {
  CSSProperties,
  PropsWithChildren,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Call,
  ParticipantView,
  StreamCall,
  useCallStateHooks,
  useParticipantViewContext,
  useStreamVideoClient,
  VideoPlaceholderProps,
} from "@stream-io/video-react-sdk";
import { Avatar, Button } from "../ui";
import { useLiveSession } from "@/hooks/use-live-session";
import { CornersOutIcon, UsersIcon } from "@phosphor-icons/react/dist/ssr";
import LiveEnded from "./live-ended";

// Add type declarations for webkit fullscreen methods
declare global {
  interface HTMLDivElement {
    webkitEnterFullscreen?: () => Promise<void>;
    mozRequestFullScreen?: () => Promise<void>;
  }
  interface HTMLVideoElement {
    webkitEnterFullscreen?: () => Promise<void>;
    mozRequestFullScreen?: () => Promise<void>;
  }
  interface Document {
    webkitExitFullscreen?: () => Promise<void>;
    webkitFullscreenElement?: Element | null;
    webkitIsFullScreen?: boolean;
    mozFullScreenElement?: Element | null;
    mozCancelFullScreen?: () => Promise<void>;
  }
}

export const CustomLivestreamPlayer = (props: {
  callType: string;
  callId: string;
}) => {
  const { callType, callId } = props;
  const client = useStreamVideoClient();

  const [call, setCall] = useState<Call>();
  useEffect(() => {
    if (!client) return;
    const myCall = client.call(callType, callId);
    myCall.setPreferredIncomingVideoResolution({ width: 1080, height: 1920 });
    setCall(myCall);
    myCall.join().catch((e) => {
      console.error("Failed to join call", e);
    });
    return () => {
      myCall.leave().catch((e) => {
        console.error("Failed to leave call", e);
      });
      setCall(undefined);
    };
  }, [client, callId, callType]);

  if (!call) return null;
  return (
    <StreamCall call={call}>
      <CustomLivestreamLayout />
    </StreamCall>
  );
};

const CustomVideoPlaceholder = ({ style }: VideoPlaceholderProps) => {
  const liveSession = useLiveSession();
  const { participant } = useParticipantViewContext();
  return (
    <div
      className="w-full h-full aspect-[9/16] flex items-center justify-center"
      style={style}
    >
      <Avatar
        size="extra-large"
        initials={participant.name}
        src={liveSession.channel.profileImageUrl}
      />
    </div>
  );
};

const useToggleFullScreen = () => {
  const { participantViewElement, videoElement } = useParticipantViewContext();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      // Check standard, webkit, and moz fullscreen
      const isInFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement
      );
      setIsFullscreen(isInFullscreen);
    };

    // Listen for all fullscreen changes
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);

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
    };
  }, []);

  return useCallback(() => {
    if (isFullscreen) {
      // Handle iOS Safari exit
      if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
        setIsFullscreen(false);
        return;
      }
      // Handle Firefox exit
      if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
        setIsFullscreen(false);
        return;
      }
      // Handle other browsers exit
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    } else {
      // Handle iOS Safari enter
      if (videoElement?.webkitEnterFullscreen) {
        videoElement.webkitEnterFullscreen();
        setIsFullscreen(true);
        return;
      }
      // Handle Firefox enter
      if (participantViewElement?.mozRequestFullScreen) {
        participantViewElement.mozRequestFullScreen();
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

const useTogglePictureInPicture = () => {
  const { videoElement } = useParticipantViewContext();
  const [isPictureInPicture, setIsPictureInPicture] = useState(
    !!document.pictureInPictureElement
  );

  useEffect(() => {
    if (!videoElement) return;

    const handlePictureInPicture = () => {
      setIsPictureInPicture(!!document.pictureInPictureElement);
    };

    videoElement.addEventListener(
      "enterpictureinpicture",
      handlePictureInPicture
    );
    videoElement.addEventListener(
      "leavepictureinpicture",
      handlePictureInPicture
    );

    return () => {
      videoElement.removeEventListener(
        "enterpictureinpicture",
        handlePictureInPicture
      );
      videoElement.removeEventListener(
        "leavepictureinpicture",
        handlePictureInPicture
      );
    };
  }, [videoElement]);

  return useCallback(() => {
    if (!videoElement) return;

    if (isPictureInPicture) {
      document.exitPictureInPicture();
    } else {
      videoElement.requestPictureInPicture();
    }
  }, [isPictureInPicture, videoElement]);
};

const CustomParticipantViewUI = (props: PropsWithChildren) => {
  const toggleFullscreen = useToggleFullScreen();
  // const togglePictureInPicture = useTogglePictureInPicture();

  return (
    <div className="flex items-center absolute -bottom-[54px] w-full gap-2">
      <div className="grow min-w-0">{props.children}</div>
      <div className="items-center gap-2 flex">
        {/* <ParticipantCounter /> */}
        <Button intent="outline" size="extra-small" onClick={toggleFullscreen}>
          <CornersOutIcon />
        </Button>
        {/* <Button
          intent="outline"
          size="extra-small"
          onClick={togglePictureInPicture}
        >
          <PictureInPictureIcon />
        </Button> */}
      </div>
    </div>
  );
};

const ParticipantCounter = () => {
  const { useCallSession } = useCallStateHooks();
  const session = useCallSession();
  const cosmoUserCount = session?.participants_count_by_role["cosmo_user"] ?? 0;
  const anonymousUserCount = session?.anonymous_participant_count ?? 0;
  return (
    <span className="text-sm font-semibold flex gap-1 items-center">
      <UsersIcon size={16} />
      {cosmoUserCount + anonymousUserCount}
    </span>
  );
};

const CustomLivestreamLayout = () => {
  const { useParticipants } = useCallStateHooks();
  const [firstParticipant] = useParticipants();
  const liveSession = useLiveSession();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      {!firstParticipant && <LiveEnded />}
      {firstParticipant && (
        <>
          <ParticipantView
            className="h-[calc(100svh-140px)] relative w-full aspect-[9/16] flex flex-col items-center justify-center gap-2 [&>video]:w-full [&>video]:h-full [&>video]:object-contain"
            // render when video is disabled
            VideoPlaceholder={CustomVideoPlaceholder}
            // render after video element
            ParticipantViewUI={
              <CustomParticipantViewUI>
                <div className="flex gap-2 items-center">
                  <Avatar
                    style={
                      {
                        "--color": liveSession.channel.primaryColorHex,
                      } as CSSProperties
                    }
                    className="outline-3 outline-(--color)"
                    src={liveSession.channel.profileImageUrl}
                    size="large"
                  />
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-semibold truncate">
                      {liveSession.title}
                    </span>
                    <span className="font-semibold text-sm">
                      {liveSession.channel.name}
                    </span>
                  </div>
                </div>
              </CustomParticipantViewUI>
            }
            participant={firstParticipant}
            muteAudio={!open}
            key={"" + open}
          />
          {!open && (
            <div className="absolute top-0 left-0 w-full h-full bg-bg/50 flex justify-center items-center">
              <Button
                intent="secondary"
                onClick={() => setOpen((prev) => !prev)}
              >
                Unmute
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
