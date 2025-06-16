"use client";

import { useEffect, useState } from "react";
import {
  Call,
  ParticipantView,
  StreamCall,
  useCallStateHooks,
  useParticipantViewContext,
  useStreamVideoClient,
  VideoPlaceholderProps,
} from "@stream-io/video-react-sdk";
import { Avatar, Button, Popover, Slider } from "../ui";
import { useLiveSession } from "@/hooks/use-live-session";
import LiveEnded from "./live-ended";
import LiveFooter from "./live-footer";
import {
  CornersOutIcon,
  SpeakerHighIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useToggleFullScreen, useUpdateCallDuration } from "./hooks";

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

function LiveControl() {
  const toggleFullscreen = useToggleFullScreen();
  return (
    <>
      <LiveDuration />
      <LiveVolumeControl />
      <Button intent="outline" size="extra-small" onClick={toggleFullscreen}>
        <CornersOutIcon />
      </Button>
    </>
  );
}

function LiveVolumeControl() {
  const { useParticipants, useSpeakerState } = useCallStateHooks();
  const [currentSpeaker] = useParticipants();
  const { speaker } = useSpeakerState();
  return (
    <Popover>
      <Button size="extra-small" intent="outline">
        <SpeakerHighIcon />
      </Button>
      <Popover.Content respectScreen={false} className="min-w-0">
        <div className="m-4">
          <Slider
            className="gap-y-0 min-h-24"
            defaultValue={currentSpeaker.audioVolume ?? 1}
            output="none"
            minValue={0}
            maxValue={1}
            step={0.01}
            aria-label="Volume"
            orientation="vertical"
            onChange={(value) => {
              speaker.setParticipantVolume(
                currentSpeaker.sessionId,
                value as number
              );
            }}
          />
        </div>
      </Popover.Content>
    </Popover>
  );
}

function LiveDuration() {
  const duration = useUpdateCallDuration();

  const formatDuration = (durationInMs: number) => {
    const days = Math.floor(durationInMs / 86400);
    const hours = Math.floor(durationInMs / 3600);
    const minutes = Math.floor((durationInMs % 3600) / 60);
    const seconds = durationInMs % 60;

    return `${days ? days + " " : ""}${hours ? hours + ":" : ""}${
      minutes < 10 ? "0" : ""
    }${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <div className="text-sm flex items-center gap-2 tabular-nums">
      {formatDuration(duration)}
    </div>
  );
}

const CustomLivestreamLayout = () => {
  const { useParticipants } = useCallStateHooks();
  const [currentSpeaker] = useParticipants();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      {currentSpeaker ? (
        <>
          <ParticipantView
            PictureInPicturePlaceholder={null}
            className="h-[calc(100svh-140px)] relative w-full aspect-[9/16] flex flex-col items-center justify-center gap-2 [&>video]:w-full [&>video]:h-full [&>video]:object-contain"
            // render when video is disabled
            VideoPlaceholder={CustomVideoPlaceholder}
            // render after video element
            ParticipantViewUI={
              <LiveFooter>
                <LiveControl />
              </LiveFooter>
            }
            participant={currentSpeaker}
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
        <LiveEnded />
      )}
    </div>
  );
};
