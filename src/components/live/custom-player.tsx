"use client";

import { CSSProperties, PropsWithChildren, useEffect, useState } from "react";
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
import { CornersOutIcon } from "@phosphor-icons/react/dist/ssr";

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

const CustomParticipantViewUI = (props: PropsWithChildren) => {
  const { participantViewElement } = useParticipantViewContext();
  const [isFullsreenElement, setIsFullscreenElement] = useState(false);
  useEffect(() => {
    // sync local state
    const handleFullscreenChange = () => {
      setIsFullscreenElement(
        document.fullscreenElement === participantViewElement
      );
    };
    window.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      window.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [participantViewElement]);
  const toggleFullscreen = () => {
    if (isFullsreenElement) {
      return document.exitFullscreen();
    }
    return participantViewElement?.requestFullscreen();
  };
  return (
    <div className="flex items-center absolute -bottom-[54px] w-full">
      <div className="grow">{props.children}</div>
      <div className="flex items-center gap-2">
        <ParticipantCounter />
        <Button intent="outline" size="extra-small" onClick={toggleFullscreen}>
          <CornersOutIcon />
        </Button>
      </div>
    </div>
  );
};

const ParticipantCounter = () => {
  const { useParticipantCount } = useCallStateHooks();
  const participantCount = useParticipantCount();
  return (
    <span className="text-sm font-semibold">Viewer: {participantCount}</span>
  );
};

const CustomLivestreamLayout = () => {
  const { useParticipants } = useCallStateHooks();
  const [firstParticipant] = useParticipants();
  const liveSession = useLiveSession();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      {firstParticipant ? (
        <>
          <ParticipantView
            className="h-[calc(100vh-140px)] relative w-full aspect-[9/16] flex flex-col gap-2 [&>video]:w-full [&>video]:h-full [&>video]:object-contain"
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
                  <div className="flex flex-col">
                    <span className="font-semibold">{liveSession.title}</span>
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
      ) : (
        <div>Stream ended</div>
      )}
    </div>
  );
};
